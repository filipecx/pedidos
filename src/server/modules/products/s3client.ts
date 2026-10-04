import { Bucket$, DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { env } from '@/lib/env';



const s3 = new S3Client({
    region: "auto",
    endpoint: env.R2_URL,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
})

export async function uploadImage(fileBuffer: any, fileName: any, mimeType: any) {
    const fileNameP = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "")}.webp`
    const uploadParams = {
        Bucket: "catalog",
        Key: fileNameP,
        Body: fileBuffer,
        ContentType: mimeType
    }

    await s3.send(new PutObjectCommand(uploadParams))
    console.log("Upload realizado com sucesso!")
    
    // Agora usando a URL pública para o frontend conseguir renderizar!
    // Como no R2 público você não precisa do nome do bucket na URL se o domínio apontar direto pra ele, 
    // a gente concatena direto.
    return `${env.R2_PUBLIC_URL}/${fileNameP}`
}

export async function deleteFromR2(fileName: any) {
    const command = new DeleteObjectCommand({Bucket: "catalog", Key: fileName})

    try {
        await s3.send(command)
        console.log("arquivo deletado com sucesso")
        return {success: true}
    } catch (e: any) {
        console.error("Erro ao deletar imagem da R2", e)
        return {success: false, error: e.message}
    }
}