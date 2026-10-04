import sharp from 'sharp'

export async function processImage(fileBuffer: any) {
    try {
        const {data, info} = await sharp(fileBuffer)
        .resize({
            width: 800,
            height: 800,
            fit: 'cover',
            position: 'center'
        })
        .webp({quality: 80, effort: 4}) 
        .toBuffer({ resolveWithObject: true })

        return {buffer: data, metadata: info}
    } catch(e) {
        console.error("Não foi possível processar a imagem: ", e)
        return {success: false, error: e}
    }
}