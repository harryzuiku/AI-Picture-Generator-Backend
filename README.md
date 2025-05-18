# 🧠 AI Picture Generator - Backend

This is the backend service for the **AI Picture Generator** app. It allows users to upload a reference image and input a prompt, which is then sent to the [Replicate](https://replicate.com/) API for AI-powered image transformation. The processed image is resized and returned to the frontend.

---

## 🚀 Features

- Upload an image with a prompt
- Send image and prompt to Replicate (using Realistic Vision model)
- Poll and retrieve the generated image result
- Resize image to target aspect ratio with `sharp`
- Serve resized image URL back to frontend
- Publicly hosted via [Railway](https://railway.app)

---

## 🛠️ Tech Stack

- Node.js + Express
- TypeScript
- Multer (for file uploads)
- Sharp (image resizing)
- Axios (HTTP requests)
- Replicate API
- Railway (deployment)

---

## 📦 Installation

```bash
# Clone the repo
git clone https://github.com/your-username/AI-Picture-Generator-Backend.git
cd AI-Picture-Generator-Backend

# Install dependencies
npm install
