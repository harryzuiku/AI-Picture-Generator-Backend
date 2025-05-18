// backend/index.ts (CommonJS fully compatible)
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
import sharp from "sharp";
import { Request, Response, NextFunction } from 'express';


// Load env variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));


// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: path.join(__dirname, 'uploads'),
    filename: (
        req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void
    ) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

const upload = multer({ storage });



// POST /generate route
app.post('/generate', upload.single('image'), async (req: Request, res: Response) => {
    try {
        const { prompt } = req.body;
        const imagePath = req.file?.path;

        if (!prompt || !imagePath) {
            return res.status(400).json({ error: 'Prompt and image are required.' });
        }

        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
        const mimeType = req.file?.mimetype || "image/jpeg";

        // Step 1: create prediction
        const predictionInit = await axios.post(
            'https://api.replicate.com/v1/predictions',
            {
                version: '6eb633a82ab3e7a4417d0af2e84e24b4b419c76f86f6e837824d02ae6845dc81',
                input: {
                    image: `data:${mimeType};base64,${imageBase64}`,
                    seed: 33,
                    prompt: prompt,
                    strength: 0.5,
                    negative_prompt: "(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4), text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck"
                }

            },
            {
                headers: {
                    Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const predictionId = predictionInit.data.id;
        const getUrl = predictionInit.data.urls.get;

        // Step 2: 轮询直到 prediction 完成
        let outputUrl = null;
        let status = predictionInit.data.status;
        let retries = 0;

        while (status !== 'succeeded' && status !== 'failed' && retries < 20) {
            await new Promise(r => setTimeout(r, 1500));
            const pollResponse = await axios.get(getUrl, {
                headers: {
                    Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`
                }
            });

            status = pollResponse.data.status;
            const output = pollResponse.data.output;

            console.log("Prediction polling status:", status);
            console.log("Poll response output:", output);

            outputUrl = Array.isArray(output) ? output[0] : output;
            retries++;
        }

        // if (status === 'succeeded' && outputUrl) {
        //     res.json({ url: outputUrl });
        // } else {
        //     res.status(500).json({ error: 'Image generation failed or timed out.' });
            
        // }

        if (status === 'succeeded' && outputUrl) {
            // 下载图片到本地
            const outputImagePath = path.join(__dirname, 'outputs', `${predictionId}.png`);
            const finalOutputPath = path.join(__dirname, 'outputs', `${predictionId}-resized.png`);
        
            // 确保 outputs 文件夹存在
            fs.mkdirSync(path.join(__dirname, 'outputs'), { recursive: true });
        
            // 下载图片
            const imageResponse = await axios.get(outputUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(outputImagePath, imageResponse.data);
        
            const aspectRatio = req.body.aspectRatio || "1:1";
        
            // 解析宽高
            const [w, h] = aspectRatio.split(":").map(Number);
            const width = 512; 
            const height = Math.round(width * (h / w));
            console.log("Aspect ratio:", req.body.aspectRatio);
            console.log("Parsed width & height:", width, height);
            // 使用 sharp 进行 resize
            const sharp = require('sharp');
            await sharp(outputImagePath)
              .resize(width, height, { fit: "cover" })
              .toFile(finalOutputPath);
        
            // 返回本地 resized 图片的 URL（可改为上传到 CDN 或 Cloudinary）
            res.json({ url: `http://localhost:5001/outputs/${path.basename(finalOutputPath)}` });
        } else {
            res.status(500).json({ error: 'Image generation failed or timed out.' });
        }

    } catch (error: any) {
        console.error('Image generation failed:', error?.response?.data || error);
        res.status(500).json({ error: 'Image generation failed' });
    }
});



app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
