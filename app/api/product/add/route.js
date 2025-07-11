import { v2 as cloudinary } from "cloudinary";
import { getAuth } from "@clerk/nextjs/server";
import authSeller from "@/lib/authSeller";
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const isSeller = await authSeller(userId);

    if (!isSeller) {
      return NextResponse.json({ success: false, message: "not authorized" });
    }

    const formData = await request.formData();

    const name = formData.get("name");
    const description = formData.get("description");
    const category = formData.get("category");
    const price = formData.get("price");
    const offerPrice = formData.get("offerPrice");
    const files = formData.getAll("images");

    // Basic validation
    if (!name || !description || !category || !price || !offerPrice) {
      return NextResponse.json({ success: false, message: "All fields are required" });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: "no files uploaded" });
    }

    let result;
    try {
      result = await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: "auto" },
              (error, result) => {
                if (error) {
                  console.error("❌ Cloudinary Error:", error);
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );
            stream.end(buffer);
          });
        })
      );
    } catch (err) {
      console.error("❌ Upload failed:", err);
      return NextResponse.json({ success: false, message: "Image upload failed" }, { status: 500 });
    }

    const image = result.map((r) => r.secure_url);

    await connectDB();
    const newProduct = await Product.create({
      userId,
      name,
      description,
      category,
      price: Number(price),
      offerPrice: Number(offerPrice),
      image,
      date: Date.now(),
    });

    return NextResponse.json({ success: true, message: "Upload successful", newProduct });

  } catch (error) {
    console.error("❌ Route Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
