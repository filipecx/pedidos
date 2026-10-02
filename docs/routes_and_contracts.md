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

## 3. Módulo de Categorias

### Telas (Frontend)
- **`/lojista/dashboard/categorias`**: Gestão das categorias da loja (listagem, criação, edição, reordenação e exclusão).

### Estado da Modelagem de Dados
A tabela `categories` possui:
- `id` (uuid)
- `storeId` (FK referenciando `stores`)
- `name` (string)
- `slug` (string, único por loja)
- `description` (string, opcional)
- `displayOrder` (inteiro)

**Estratégia de Ordenação (`display_order`):**
A ordenação utilizará uma estratégia de incremento espaçado (de **10 em 10**, ex: 10, 20, 30).
Se for necessário reposicionar uma categoria no meio de outras duas (ex: mover algo para entre a 10 e a 20), podemos apenas atribuir o valor 15.
Isso evita a necessidade de um UPDATE massivo em múltiplas linhas no banco de dados apenas para "abrir espaço" para a nova posição (técnica similar ao conceito de LexoRank).

**Utilidade do campo `slug`:**
O `slug` serve para garantir URLs amigáveis e otimizadas para SEO na vitrine pública.
Em vez de acessar `/loja/doces-da-maria/categoria/123e4567-e89b-12d3`, o cliente acessará `/loja/doces-da-maria/c/bolos-de-pote`. Isso soa mais profissional, melhora a indexação no Google e facilita a parametrização nas rotas do Next.js.
