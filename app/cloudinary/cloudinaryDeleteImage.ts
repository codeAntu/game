import { v2 as cloudinary } from 'cloudinary'

export default async function imageDelete(publicId: string) {
  return new Promise(async (resolve, reject) => {
    await cloudinary.uploader.destroy(publicId, (error: any, result: any) => {
      if (error) {
        return reject(error)
      } else {
        return resolve(result)
      }
    })
  })
}
