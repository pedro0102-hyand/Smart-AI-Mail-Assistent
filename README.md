# 📬 Smart AI Mail Assistant

> Assistente inteligente full-stack de triagem, análise e resposta de e-mails com arquitetura de Inteligência Artificial em **3 Camadas (Machine Learning Clássico + Deep Learning Zero-Shot NLI + LLM Generativa)**.

---

## 🌟 Visão Geral

O **Smart AI Mail Assistant** conecta-se à sua conta do Google via OAuth 2.0 e Gmail API para transformar uma caixa de entrada caótica em um ambiente de trabalho organizado e altamente produtivo.

Em vez de sobrecarregar uma única inteligência artificial cara e pesada para todas as tarefas, o sistema implementa uma **esteira hierárquica e inteligente de processamento**, onde cada modelo resolve o problema para o qual é mais eficiente em custo, latência e precisão.

---

## 🧠 Arquitetura de Inteligência Artificial em 3 Camadas

```
                                  [ Novo E-mail do Gmail ]
                                             │
                                             ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │ CAMADA 1: FILTRAGEM INSTANTÂNEA DE SPAM & PHISHING (ML Clássico)      │
       │ Modelo: Multinomial Naive Bayes + TF-IDF Vectorizer                    │
       │ Tempo de inferência: < 2 ms | Custo: R$ 0,00                           │
       └────────────────────────────────────────────────────────────────────────┘
                                    /               \
                       É Spam (True)                 Não é Spam (False)
                            /                                 \
                           ▼                                   ▼
        [ Marcação de Segurança no Banco ]    ┌─────────────────────────────────┐
        (is_spam=True, spam_score=0.98)       │ CAMADA 2: TRIAGEM DE            │
                           │                  │ PRODUTIVIDADE (Deep Learning)   │
                           │                  │ Modelo: mDeBERTa-v3-base        │
                           │                  │ Técnica: Zero-Shot NLI          │
                           │                  │ Inferência local (CPU)          │
                           │                  └─────────────────────────────────┘
                           │                                   │
                           │                           Produtivo ou Improdutivo?
                           │                           (is_productive, score)
                           │                                   │
                           └─────────────────┬─────────────────┘
                                             │
                                             ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │ CAMADA 3: COMPREENSÃO SEMÂNTICA & GERAÇÃO (LLM)                        │
       │ Modelo: Google Gemini 2.5 Flash Lite (Modo JSON Nativo, Temp = 0.6)    │
       │ Saída: Categorização Fina + Grau de Urgência + Resumo + Resposta IA    │
       └────────────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ Justificativas Técnicas e Decisões de Arquitetura

### 1. Por que Naive Bayes para detecção de Spam?
* **Eficiência e Velocidade**: O algoritmo Naive Bayes com ponderação sublinear de frequência de termos (TF-IDF) roda em menos de 2 milissegundos na CPU.
* **Custo Zero**: Não consome tokens de API nem exige GPU para classificar centenas de mensagens recebidas diariamente.
* **Treinamento Híbrido**: Treinado em uma base mesclada contendo o clássico dataset Enron (~5.170 e-mails) combinado com um corpus sintético calibrado em Português do Brasil com casos modernos de phishing (falsos boletos, clonagem de chaves Pix, notificações bancárias fraudulentas). Acurácia de teste: **> 98%**.

### 2. Por que mDeBERTa-v3 para Produtividade via Zero-Shot NLI?
* **Zero-Shot sem necessidade de dados de treino**: A abordagem de **Inferência de Linguagem Natural (NLI)** avalia a probabilidade de uma premissa (*o e-mail*) implicar uma hipótese (*"Este é um e-mail de comunicação produtivo"* vs *"improdutivo"*). Não foi necessário criar ou rotular milhares de e-mails para ensinar o conceito de produtividade.
* **Compreensão Multilíngue**: O modelo `MoritzLaurer/mDeBERTa-v3-base-mnli-xnli` possui atenção desagrupada (*disentangled attention*) e suporte nativo ao Português.
* **Calibração de Threshold**: O limiar de decisão foi ajustado de `0.50` para `0.65`, eliminando falsos positivos frequentes em newsletters corporativas e comunicados de marketing.
* **Startup Warm-up**: O modelo é pré-aquecido no ciclo `lifespan` do FastAPI, eliminando o *cold start* para o usuário final.

### 3. Por que **NÃO** fizemos Fine-Tuning do BERTimbau para Categorias?
* **Complexidade Operacional Desnecessária**: Treinar um encoder customizado exigiria gerar e rotular centenas de exemplos sintéticos balanceados, depender de ambientes de GPU externos (Google Colab), empacotar arquivos pesados de pesos adicionais (~500 MB) e criar pipelines contínuos de retreino.
* **Capacidade Semântica Superior do Gemini**: Modelos de fronteira modernos superam encoders clássicos em tarefas de categorização temática aberta e contextual. Com engenharia de prompt estruturada e modo JSON nativo, o Gemini alcança assertividade cirúrgica sem qualquer sobrecarga de manutenção de modelos locais.

### 4. Por que Google Gemini 2.5 Flash Lite para a Camada Generativa?
* **Saída Estruturada Nativa**: Utiliza `response_mime_type="application/json"` diretamente da SDK Google GenAI, garantindo 100% de conformidade com o esquema esperado e eliminando falhas de decodificação JSON.
* **Temperatura Calibrada em 0.6**: Proporciona o equilíbrio ideal entre precisão classificatória e fluidez textual natural para elaboração de rascunhos de resposta corteses e profissionais.
* **Sinergia Multimodelo**: O prompt recebe os resultados das camadas anteriores (se o Naive Bayes marcou como spam ou se o mDeBERTa marcou como produtivo). Se o e-mail for identificado como spam ou marketing comercial, o sistema **proíbe a geração de rascunho de resposta**, evitando respostas acidentais a golpistas ou robôs.

---

## 🗂️ Estrutura do Repositório

```
Smart-AI-Mail-Assistent/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py                  # Configurações e variáveis de ambiente
│   │   │   ├── database.py                # Conexão SQLAlchemy e Engine SQLite
│   │   │   └── security.py                # Validação de JWT e dependência de autenticação
│   │   ├── ml/
│   │   │   ├── data/                      # Datasets de treino (Enron + PT-BR)
│   │   │   ├── train_spam_model.py        # Pipeline de treino Naive Bayes + TF-IDF
│   │   │   ├── spam_service.py            # Serviço de inferência de Spam
│   │   │   ├── productivity_service.py    # Serviço de inferência Zero-Shot mDeBERTa
│   │   │   ├── spam_model.joblib          # Modelo serializado Naive Bayes
│   │   │   └── tfidf_vectorizer.joblib    # Vetorizador TF-IDF serializado
│   │   ├── models/
│   │   │   ├── user_model.py              # Entidade Usuário
│   │   │   ├── email_model.py             # Entidade E-mail (com is_spam e spam_score)
│   │   │   ├── email_productivity_model.py# Entidade Produtividade (mDeBERTa)
│   │   │   └── email_analysis_model.py    # Entidade Análise Semântica (Gemini)
│   │   ├── routers/
│   │   │   ├── auth_router.py             # Fluxo Google OAuth 2.0
│   │   │   ├── email_router.py            # Sincronização, listagem e resposta via Gmail
│   │   │   ├── productivity_router.py     # Classificação em background de produtividade
│   │   │   └── ai_router.py               # Análise e categorização em background via Gemini
│   │   ├── services/
│   │   │   ├── google_auth_service.py     # Troca de código de autorização Google
│   │   │   ├── gmail_service.py           # Fetch e Send de mensagens na Gmail API
│   │   │   └── ai_service.py              # Pipeline Gemini 2.5 Flash Lite com retry exponencial
│   │   └── main.py                        # Ponto de entrada FastAPI com lifespan e CORS
│   ├── backfill_productivity.py           # Script autônomo para classificação retroativa
│   └── requirements.txt                   # Dependências Python travadas
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Sidebar.jsx                # Navegação lateral responsiva
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx              # Autenticação Google + Alerta de sessão expirada
│   │   │   ├── AuthSuccess.jsx            # Captura de token pós-OAuth
│   │   │   ├── InboxPage.jsx              # Caixa de entrada, filtros, badges, paginação e progresso
│   │   │   ├── EmailDetailPage.jsx        # Leitura de e-mail, banner de spam e resposta com IA
│   │   │   └── DashboardPage.jsx          # Métricas visuais, gráficos de categoria e produtividade
│   │   ├── api.js                         # Cliente HTTP com interceptador 401 e auto-redirect
│   │   ├── index.css                      # Estilização completa com suporte a Dark Mode
│   │   └── App.jsx                        # Roteamento React Router v7 e ThemeContext
│   └── package.json
└── README.md
```

---

## 🛠️ Tecnologias Utilizadas

### Backend & Machine Learning
* **FastAPI**: API assíncrona de alta performance com suporte nativo a `BackgroundTasks`.
* **Scikit-Learn**: Algoritmo `MultinomialNB`, vetorização `TfidfVectorizer` e pipeline de métricas.
* **Hugging Face Transformers & PyTorch**: Pipeline de classificação `zero-shot-classification` com `mDeBERTa-v3`.
* **Google Generative AI SDK**: Integração com Gemini 2.5 Flash Lite em modo JSON nativo.
* **SQLAlchemy & SQLite**: Modelagem relacional com carregamento otimizado via `joinedload`.
* **Google APIs Client**: Leitura segura da caixa de entrada e envio de e-mails autenticados.

### Frontend
* **React 19 & Vite**: Interface moderna, reativa e ultrarrápida.
* **React Router v7**: Roteamento de SPA com proteção de rotas privadas.
* **Polling Reativo**: Acompanhamento de progresso em tempo real de tarefas em background sem travamento de tela.

---

## 🚀 Instalação e Execução

### Pré-requisitos
* Python 3.10+
* Node.js 20+
* Projeto criado no [Google Cloud Console](https://console.cloud.google.com/) com as APIs **Gmail API** e **Google People API** ativadas.
* Chave de API do [Google AI Studio (Gemini)](https://aistudio.google.com/).

---

### 1. Configuração do Backend

```bash
cd backend

# Crie e ative o ambiente virtual
python3 -m venv venv
source venv/bin/activate       # No Windows: venv\Scripts\activate

# Instale as dependências
pip install -r requirements.txt
```

Crie o arquivo `.env` na raiz do projeto (ou dentro da pasta `backend/`):

```env
# Google OAuth2
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback

# Gemini API
GEMINI_API_KEY=sua_chave_do_google_ai_studio

# JWT Security
JWT_SECRET_KEY=uma_chave_secreta_longa_e_aleatoria_para_assinatura_jwt
```

Inicie o servidor backend:

```bash
uvicorn app.main:app --reload --port 8000
```

> A documentação Swagger interativa estará acessível em: `http://localhost:8000/docs`

---

### 2. Configuração do Frontend

Em outro terminal:

```bash
cd frontend

# Instale os pacotes
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

> A aplicação estará pronta no navegador em: `http://localhost:5173`

---

## 📡 Principais Endpoints da API

| Método | Endpoint | Descrição | Camada Envolvida |
|---|---|---|---|
| `GET` | `/auth/google` | Inicia fluxo de login Google OAuth2 | Autenticação |
| `GET` | `/auth/callback` | Retorna o JWT da aplicação | Autenticação |
| `POST` | `/emails/sync` | Sincroniza e-mails do Gmail e roda Naive Bayes | **Camada 1 (Naive Bayes)** |
| `GET` | `/emails/` | Lista e-mails com suporte a paginação e filtro de spam | Banco de Dados |
| `GET` | `/emails/{id}` | Retorna e-mail completo com badges e análise | Banco de Dados |
| `POST` | `/emails/{id}/reply` | Envia resposta diretamente via Gmail API | Gmail Service |
| `GET` | `/emails/stats` | Estatísticas para KPIs e gráficos do Dashboard | Agregação SQL |
| `POST` | `/productivity/classify-all` | Dispara classificação mDeBERTa em background | **Camada 2 (mDeBERTa)** |
| `GET` | `/productivity/classify-all/status` | Progresso em tempo real da classificação de produtividade | Background Worker |
| `POST` | `/ai/analyze/{id}` | Analisa e-mail individual com Gemini | **Camada 3 (Gemini)** |
| `POST` | `/ai/analyze-all` | Dispara análise semântica em lote em background | **Camada 3 (Gemini)** |
| `GET` | `/ai/analyze-all/status` | Progresso em tempo real do processamento de resumos/categorias | Background Worker |

---

## 🛡️ Robustez e UX Implementadas

1. **Auto-Renovação de Tokens do Google**: O `gmail_service.py` renova o access token silenciosamente usando o `refresh_token` e persiste a credencial no SQLite automaticamente.
2. **Redirecionamento Suave em 401**: Se o usuário revogar o acesso ou a sessão JWT expirar, o cliente HTTP intercepta a resposta, limpa o armazenamento local e redireciona para a tela de login com uma notificação amigável (`/?expired=1`).
3. **Paginação Eficiente**: A Inbox utiliza busca paginada (`limit=20`, `skip=N`), permitindo carregar centenas de e-mails progressivamente sem lentidão no navegador.
4. **Resiliência a Rate Limit da Gemini API**: O serviço generativo conta com mecanismo de retentativas automáticas e backoff exponencial (2s → 4s → 8s) para absorver eventuais picos de uso.

---

## 📄 Licença

Projeto desenvolvido para fins educacionais e de portfólio em Engenharia de Software, Processamento de Linguagem Natural (NLP) e Machine Learning. Sinta-se à vontade para utilizar e expandir.
