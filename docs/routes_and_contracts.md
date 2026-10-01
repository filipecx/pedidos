# Mapeamento de Rotas e Contratos de Dados

Como nossa arquitetura utiliza o padrão de **Server Actions** do Next.js (React 19), nós não expomos endpoints REST tradicionais (como `POST /api/store`). Em vez disso, o Frontend se comunica com o Backend de forma segura via RPC (Remote Procedure Call).

Este documento mapeia as Telas da aplicação e os contratos de dados (Payloads esperados pelas Actions).

---

## 1. Módulo de Autenticação / Lojista

### Telas (Frontend)
- **`/lojista/cadastro`**: Tela pública de registro.

### Contrato: `registerLojistaAction`
Responsável por criar a conta do Lojista e disparar o e-mail de boas-vindas assíncrono (via BullMQ).
- **Regra de Segurança**: Middleware injeta obrigatoriamente a role `CLIENTE` e o Backend promove de forma segura para `LOJISTA`.
- **Payload Esperado (FormData)**:
  ```json
  {
    "name": "string (obrigatório, nome do dono ou da marca)",
    "email": "string (obrigatório, formato e-mail válido)",
    "password": "string (obrigatório, mínimo 8 caracteres)",
    "phone": "string (opcional, formato livre)"
  }
  ```
- **Retornos**:
  - **Sucesso**: Redireciona para `/lojista/onboarding`
  - **Erro**: `{ success: false, error: string, fieldErrors?: object }`

---

## 2. Módulo de Loja (Store)

### Telas (Frontend)
- **`/lojista/onboarding`**: Tela restrita onde o Lojista define o nome público da sua vitrine.
- **`/lojista/dashboard`**: Tela raiz administrativa (Visão geral de métricas).
- **`/lojista/dashboard/personalizacao`**: Tela restrita de configuração de tema e visual da vitrine.

### Contrato: `createStoreAction`
Cria a loja inicial e amarra ao `userId` do lojista autenticado.
- **Regra de Segurança**: Bloqueia se a sessão não for de Lojista ou se o usuário já possuir uma loja criada. Verifica unicidade do `slug`.
- **Payload Esperado (FormData)**:
  ```json
  {
    "name": "string (obrigatório, min: 3 caracteres)",
    "slug": "string (obrigatório, apenas letras minúsculas, números e hífens. min: 3 caracteres)"
  }
  ```
- **Retornos**:
  - **Sucesso**: Redireciona para `/lojista/dashboard`
  - **Erro**: `{ success: false, error: string, fieldErrors?: object }`

### Contrato: `updateStoreCustomizationAction`
Atualiza os campos JSON (`themeColors` e `layoutConfig`) e imagens da Loja.
- **Regra de Segurança**: Apenas altera a loja vinculada ao próprio `session.user.id` do lojista logado. Protegido contra IDOR.
- **Payload Esperado (FormData)**:
  ```json
  {
    "colorPrimary": "string (opcional, regex Hexadecimal. ex: #ff0000)",
    "colorBackground": "string (opcional, regex Hexadecimal)",
    "colorText": "string (opcional, regex Hexadecimal)",
    "productView": "enum ('list' | 'grid')",
    "categoryPosition": "enum ('top' | 'sidebar')",
    "bannerUrl": "string (opcional, formato URL ou string vazia)",
    "profileUrl": "string (opcional, formato URL ou string vazia)"
  }
  ```
- **Retornos**:
  - **Sucesso**: `{ success: true, message: "Personalização salva com sucesso!" }` (E dispara `revalidatePath` para atualizar a UI).
  - **Erro**: `{ success: false, error: string, fieldErrors?: object }`

---

*Nota Arquitetural: Todos os payloads acima são estritamente validados pela biblioteca `Zod` dentro dos schemas de cada módulo antes de tocarem a regra de negócio no Banco de Dados.*
