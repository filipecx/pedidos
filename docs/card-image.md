# 📋 Card Técnico: Upload, Otimização e Armazenamento de Imagens de Produtos (Cloudflare R2)

### 🎯 Objetivo
Permitir que usuários façam upload de fotos para produtos e combos (tanto na criação quanto na edição), processando e comprimindo as imagens no servidor para WebP e armazenando-as no Cloudflare R2 com link público padrão (`r2.dev`).

---

### 📦 1. Pré-requisitos & Dependências
- [ ] Bucket criado no Cloudflare R2 com **R2.dev subdomain** habilitado.
- [ ] Credenciais configuradas no `.env`:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_URL` (ex: `https://pub-xxxxxxxx.r2.dev`)
- [ ] Instalar dependências:
  ```bash
  npm install @aws-sdk/client-s3 sharp
  npm install -D @types/sharp
  ```
- [ ] Liberar domínio no `next.config.ts` (ou `next.config.js`):
  ```ts
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
      },
    ],
  }
  ```

---

### ⚙️ 2. Arquitetura do Backend & Utilitários

#### A. Cliente S3 / R2 (`src/lib/r2.ts`)
- Inicializar instância do `S3Client` apontando para o endpoint do Cloudflare R2.
- Criar funções auxiliares:
  - `uploadToR2(buffer, key, mimeType)`
  - `deleteFromR2(keyOrUrl)`

#### B. Serviço de Processamento de Imagem (`src/lib/image-processor.ts`)
- Utilizar `sharp` para converter e otimizar:
  - Redimensionamento máximo: largura 1000px, altura 1000px (`fit: 'inside'`, preservando proporção).
  - Conversão de formato: `.webp`.
  - Compressão: qualidade entre 75% e 80%.
  - *Retorno:* Buffer processado + metadados.

#### C. Server Actions (`src/actions/products.ts`)
- **Criar Produto/Combo:**
  1. Receber `FormData` (campos do produto + `File`).
  2. Validar tamanho máximo permitido (ex: até 5MB) e formato (JPEG, PNG, WEBP).
  3. Se houver arquivo:
     - Processar com `sharp`.
     - Gerar nome único (`produtos/${randomUUID()}.webp`).
     - Fazer upload no R2.
     - Montar URL pública: `${R2_PUBLIC_URL}/${key}`.
  4. Salvar produto no banco de dados com a `imageUrl`.
- **Editar Produto/Combo:**
  1. Se uma nova imagem foi enviada:
     - Fazer upload e gerar a nova URL.
     - Deletar a imagem antiga do R2 (se existia e não era imagem padrão).
     - Atualizar registro com nova URL.
  2. Se a imagem foi apenas removida:
     - Deletar a imagem antiga do R2 e setar `imageUrl = null`.

---

### 💻 3. Frontend & Componente de Formulário

#### A. Componente `ImageUploadInput`
- Input escondido `<input type="file" accept="image/*" />`.
- Área com "Drag and Drop" e clique amigável (funciona perfeitamente no mobile/câmera).
- **Preview imediato:** Usar `URL.createObjectURL(file)` para visualização antes de submeter.
- **Ações:**
  - Botão de alterar imagem.
  - Botão de remover imagem selecionada.
- Suporte para estado inicial (ao carregar formulário de **edição**, exibir a imagem atual vinda do banco).

#### B. Integração nos Formulários de Criação e Edição
- Adicionar o componente nos formulários de Produto e Combo.
- Exibir estado de loading/desabilitar botão "Salvar" durante o processamento da ação.

---

### 🧪 4. Critérios de Aceite & Testes
- [ ] Upload de imagem feito tanto pelo celular (câmera/galeria) quanto pelo desktop.
- [ ] Imagem salva no R2 em formato `.webp` com tamanho inferior a 250 KB (mesmo vindo de fotos originais de 5MB+).
- [ ] Imagem carrega corretamente na vitrine utilizando o componente `<Image />` do Next.js.
- [ ] Na edição do produto:
  - Se substituir a imagem, a antiga é removida do R2 e a nova passa a ser exibida.
  - Se editar apenas texto/preço sem mexer na foto, a URL existente é mantida intacta.
- [ ] Tentativa de upload de arquivo não-imagem (ex: `.pdf`, `.exe`) é rejeitada com mensagem amigável de erro.
