import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { env } from '@/lib/env';

const s3 = new S3Client({
    region: "auto",
    endpoint: env.R2_URL,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
})

export async function uploadImage(fileBuffer: Buffer, fileName: string, mimeType: string) {
    const safeName = (fileName || "image")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "image";

    const fileNameP = `${Date.now()}-${safeName}.webp`;
    const uploadParams = {
        Bucket: "catalog",
        Key: fileNameP,
        Body: fileBuffer,
        ContentType: mimeType,
    };

    await s3.send(new PutObjectCommand(uploadParams));

    const publicBaseUrl = env.R2_PUBLIC_URL.replace(/\/+$/, "");
    return `${publicBaseUrl}/${fileNameP}`;
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