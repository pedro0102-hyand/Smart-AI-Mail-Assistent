

## ✨ Descrição

O **Smart AI Mail Assistant** é uma aplicação full-stack que integra o Gmail com inteligência artificial (Google Gemini) para transformar a forma como você lida com sua caixa de entrada. Com uma única análise, a IA gera um resumo do e-mail, classifica a categoria, define o nível de urgência e sugere uma resposta profissional pronta para envio.



---

## 🖥️ Preview

| Página | Descrição |
|--------|-----------|
| `/` | Login com Google OAuth2 |
| `/inbox` | Lista de e-mails com categorias e urgência |
| `/email/:id` | Detalhes, análise IA e resposta |
| `/dashboard` | Estatísticas e gráficos por categoria/urgência |

---

## 🗂️ Estrutura do Projeto

```
📦 smart-ai-mail/
├── backend/
│   └── app/
│       ├── core/
│       │   ├── config.py          # Variáveis de ambiente
│       │   ├── database.py        # SQLAlchemy + SQLite
│       │   └── security.py        # JWT
│       ├── models/
│       │   ├── user_model.py
│       │   ├── email_model.py
│       │   └── email_analysis_model.py
│       ├── routers/
│       │   ├── auth_router.py     # OAuth2 Google
│       │   ├── email_router.py    # CRUD + sync Gmail
│       │   └── ai_router.py       # Análise IA (Gemini)
│       ├── services/
│       │   ├── google_auth_service.py
│       │   ├── gmail_service.py
│       │   └── ai_service.py      # Integração Gemini
│       └── main.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── AuthSuccess.jsx
│       │   ├── InboxPage.jsx
│       │   ├── EmailDetailPage.jsx
│       │   └── DashboardPage.jsx
│       ├── components/
│       │   └── Sidebar.jsx
│       ├── api.js
│       └── App.jsx
├── requirements.txt
└── README.md
```

---

## 🚀 Tecnologias

### Backend
| Tecnologia | Uso |
|-----------|-----|
| **FastAPI** | Framework web (Python) |
| **SQLAlchemy** | ORM + SQLite |
| **Google OAuth2** | Autenticação |
| **Gmail API** | Leitura e envio de e-mails |
| **Google Gemini 2.5 Flash Lite** | Análise com IA |
| **Python-JOSE** | Geração e validação de JWT |

### Frontend
| Tecnologia | Uso |
|-----------|-----|
| **React 19** | Interface de usuário |
| **Vite** | Build e dev server |
| **React Router v7** | Navegação SPA |
| **CSS-in-JS** | Estilização inline + index.css |

---

## ⚙️ Configuração e Instalação

### Pré-requisitos

- Python 3.10+
- Node.js 20+
- Conta Google Cloud com OAuth2 configurado
- Chave de API do Google Gemini

---

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/smart-ai-mail.git
cd smart-ai-mail
```

---

### 2. Backend

#### Instale as dependências

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Linux/macOS
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

#### Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (ou dentro de `backend/`):

```env
# Google OAuth2
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback

# Gemini AI
GEMINI_API_KEY=sua_chave_gemini_aqui

# JWT
JWT_SECRET_KEY=uma_chave_secreta_longa_e_aleatoria
```

#### Inicie o servidor

```bash
uvicorn app.main:app --reload
```

O backend estará disponível em: `http://localhost:8000`  
Documentação interativa (Swagger): `http://localhost:8000/docs`

---

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em: `http://localhost:5173`

---

### 4. Configurar o Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto novo
3. Ative as APIs:
   - **Gmail API**
   - **Google People API** (para dados do perfil)
4. Em **Credenciais**, crie um **ID de cliente OAuth 2.0** (tipo: Aplicativo da Web)
5. Em **URIs de redirecionamento autorizados**, adicione:
   ```
   http://localhost:8000/auth/callback
   ```
6. Copie o Client ID e o Client Secret para o `.env`

---

## 📡 Endpoints da API

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/auth/google` | Inicia login com Google |
| `GET` | `/auth/callback` | Callback OAuth2 → retorna JWT |
| `GET` | `/auth/me` | Dados do usuário autenticado |

### E-mails
| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/emails/sync` | Sincroniza e-mails do Gmail |
| `GET` | `/emails/` | Lista e-mails (paginado) |
| `GET` | `/emails/{id}` | Detalhes de um e-mail |
| `POST` | `/emails/{id}/reply` | Envia resposta via Gmail |
| `GET` | `/emails/stats` | Estatísticas por categoria/urgência |

### Inteligência Artificial
| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/ai/analyze/{id}` | Analisa um e-mail com IA |
| `POST` | `/ai/analyze-all` | Analisa todos os e-mails pendentes (background) |
| `GET` | `/ai/analyze-all/status` | Progresso da análise em batch |

---

## 🤖 Como funciona a IA

A integração com o **Google Gemini** é feita em uma única chamada por e-mail (reduzindo latência e custo), retornando:

```json
{
  "summary": "Resumo em até 3 frases",
  "category": "trabalho | financeiro | pessoal | marketing | spam | suporte | outro",
  "urgency": "alta | média | baixa",
  "suggested_reply": "Rascunho de resposta profissional em português"
}
```

A análise em batch (`/ai/analyze-all`) roda em **background** via FastAPI `BackgroundTasks`, permitindo que o frontend continue responsivo enquanto os e-mails são processados.

O serviço inclui **retry automático com backoff exponencial** para lidar com limites de taxa da API Gemini:
- Tentativa 1 → aguarda 2s
- Tentativa 2 → aguarda 4s
- Tentativa 3 → aguarda 8s

---

## 🎨 Funcionalidades do Frontend

- ✅ Login com Google OAuth2
- ✅ Sincronização de e-mails do Gmail
- ✅ Listagem com preview, categoria e urgência
- ✅ Análise IA individual ou em lote
- ✅ Visualização completa do e-mail (HTML ou texto plano)
- ✅ Resposta sugerida pela IA com edição livre antes do envio
- ✅ Dashboard com gráficos de categoria e urgência
- ✅ **Modo escuro / claro** com persistência no localStorage
- ✅ **Design responsivo** para mobile, tablet e desktop

---

## 🔒 Segurança

- Autenticação via **JWT** com expiração de 24 horas
- Tokens do Google armazenados no banco e **renovados automaticamente** via refresh token
- Comunicação com o backend protegida por `Authorization: Bearer <token>`
- Dados sensíveis isolados em `.env` (não versionado)

---

## 📝 Licença

Este projeto é de uso pessoal/educacional. Sinta-se livre para adaptar e reutilizar.

---

## 🙋 Contribuindo

Pull requests são bem-vindos! Para mudanças maiores, abra uma issue primeiro para discutirmos o que você gostaria de mudar.

1. Faça um fork do projeto
2. Crie sua branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: adiciona minha feature'`
4. Push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

