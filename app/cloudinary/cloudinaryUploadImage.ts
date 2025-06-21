import { v2 as cloudinary } from 'cloudinary'

export default async function imageUpload(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = Buffer.from(buffer)

  return new Promise(async (resolve, reject) => {
    await cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'image',
          folder: 'throbuzz',
        },
        async (error: any, result: any) => {
          if (error) {
            return reject(error)
          } else {
            return resolve(result)
          }
        },
      )
      .end(bytes)
  })
}
