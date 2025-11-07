// import { NextRequest, NextResponse } from "next/server";
// import { v2 as cloudinary } from "cloudinary";
// import { error } from "console";

// cloudinary.config({
//     cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
//     api_key: process.env.CLOUDINARY_API_KEY!,
//     api_secret: process.env.CLOUDINARY_API_SECRET!
// })

// interface uploadResponse {
//     public_id: string,
//     url: string,
//     resource_type: string
// }

// export async function POST(req: NextRequest) {
//     try {
//         const body = await req.formData();
//         console.log("Received body:", body);
//         const file = body.get("file") as File | null;

//         if (!file) {
//             return NextResponse.json({ message: "No file provided" }, { status: 400 });
//         }

//         const bytes = await file.arrayBuffer();
//         const buffer = Buffer.from(bytes);

//         const result = await new Promise<uploadResponse>((resolve, reject) => {
//             const upload_stream = cloudinary.uploader.upload_stream(
//                 { folder: 'vibecall_images' },
//                 (error, result) => {
//                     if (error) reject(error);
//                     else resolve(result as uploadResponse);
//                 }
//             );
//             upload_stream.end(buffer);
//         });

//         console.log("result url ", result.url)

//         return NextResponse.json({ messages: "image uploaded" ,url: result }, { status: 200 });
//     } catch (err) {
//         console.error("Error uploading image:", err);
//         return NextResponse.json({ message: "Failed to upload image" }, { status: 500 });
//     }
// }

// const upload_stream = cloudinary.uploader.upload_stream(options, callback);
//what does this do -> Cloudinary gives you a writable stream — like a “pipe” that Cloudinary is waiting to receive data through.\


// What is .end(buffer)?
// upload_stream.end(buffer) does two things:
// Writes the data (your buffer) into the stream.
// → This sends your file’s binary data to Cloudinary.

// Closes (“ends”) the stream.
// → This tells Cloudinary: “I’ve sent all the data — start processing 

// 💡 1️⃣ Why you need a Promise

// Cloudinary’s upload_stream() method is callback-based, not Promise-based.
// It looks like this:

// cloudinary.uploader.upload_stream(options, (error, result) => {
//   // this runs later
// });


// That callback executes after Cloudinary finishes uploading.
// But your function (like a Next.js API route) is async, which means it expects something you can await.

// You can only await a Promise, not a callback


import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!
});

interface UploadResponse {
  public_id: string;
  url: string;
  resource_type: string;
  bytes?: number;
  duration?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();
    const file = body.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    // ✅ Determine type dynamically
    const mimeType = file.type;
    const isVideo = mimeType.startsWith("video/");
    const folder = isVideo ? "vibecall_videos" : "vibecall_images";

    // Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise<UploadResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isVideo ? "video" : "image",
          transformation: isVideo
            ? [{ quality: "auto", fetch_format: "mp4" }]
            : [{ quality: "auto" }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as UploadResponse);
        }
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json(
      { message: `${isVideo ? "video" : "image"} uploaded`, url: result },
      { status: 200 }
    );

  } catch (err) {
    console.error("Error uploading file:", err);
    return NextResponse.json({ message: "Failed to upload file" }, { status: 500 });
  }
}
