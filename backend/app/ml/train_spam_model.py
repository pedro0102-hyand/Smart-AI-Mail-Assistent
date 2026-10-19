import os
import re
from pathlib import Path
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
ENRON_DATASET_PATH = DATA_DIR / "spam_ham_dataset.csv"
PTBR_DATASET_PATH = DATA_DIR / "dataset_spam_email_ptbr_200.csv"
MODEL_OUTPUT_PATH = BASE_DIR / "spam_model.joblib"
VECTORIZER_OUTPUT_PATH = BASE_DIR / "tfidf_vectorizer.joblib"

def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    
    text = re.sub(r"^(subject|assunto):\s*", "", text, flags=re.IGNORECASE) # Remove prefixos comuns como "Subject:" ou "Assunto:"
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"https?://\S+|www\.\S+", " url_link ", text) # Substitui URLs por um token genérico 'url_link'
    text = re.sub(r"[^a-zA-Z0-9áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text

def load_and_merge_datasets() -> pd.DataFrame:

    if not ENRON_DATASET_PATH.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {ENRON_DATASET_PATH}")
    if not PTBR_DATASET_PATH.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {PTBR_DATASET_PATH}")
    print("📂 Carregando datasets...")

    # Leitura do dataset do Enron (Inglês)
    df_enron = pd.read_csv(ENRON_DATASET_PATH)
    df_enron_clean = pd.DataFrame({"text": df_enron["text"].astype(str), "label": df_enron["label_num"].astype(int)})
    print(f"   ✓ Enron (Global): {len(df_enron_clean):,} registros carregados.")
    
    # Leitura do dataset em Português (PT-BR)
    df_ptbr = pd.read_csv(PTBR_DATASET_PATH)
    df_ptbr_clean = pd.DataFrame({"text": df_ptbr["text"].astype(str),"label": df_ptbr["label"].astype(int)})
    print(f"   ✓ Português (PT-BR): {len(df_ptbr_clean):,} registros carregados.")

    # Concatena os dois datasets em um único DataFrame
    df_combined = pd.concat([df_enron_clean, df_ptbr_clean], ignore_index=True)

    # Remove duplicatas e linhas vazias
    df_combined = df_combined.dropna().drop_duplicates(subset=["text"])

    total = len(df_combined)
    total_ham = int((df_combined["label"] == 0).sum())
    total_spam = int((df_combined["label"] == 1).sum())
    print(f"\n📊 Dataset Unificado:")
    print(f"   - Total de e-mails únicos: {total:,}")
    print(f"   - Legítimos (Ham - 0): {total_ham:,} ({total_ham/total*100:.1f}%)")
    print(f"   - Spam (1): {total_spam:,} ({total_spam/total*100:.1f}%)")
    return df_combined

def prepare_and_vectorize_data(df: pd.DataFrame):

    print("\n🧹 Aplicando pré-processamento (clean_text) em todos os e-mails...")
    df["clean_text"] = df["text"].apply(clean_text)

    print("\n✂️  Dividindo em conjuntos de Treino (70%) e Teste (30%)...")
    X_train, X_test, y_train, y_test = train_test_split(df["clean_text"],df["label"], test_size=0.30, random_state=42, stratify=df["label"])
    print(f"   ✓ E-mails para Treino: {len(X_train):,}")
    print(f"   ✓ E-mails para Teste:  {len(X_test):,}")

    print("\n🔤 Ajustando o TfidfVectorizer (extraindo vocabulário e pesos)...")
    vectorizer = TfidfVectorizer(
        ngram_range = (1, 2),    # Extrai palavras isoladas (unigramas) e expressões de 2 palavras (bigramas)
        max_df = 0.95,           # Ignora termos que aparecem em mais de 95% dos e-mails
        min_df = 2,              # Ignora palavras que aparecem menos de 2 vezes (erros de digitação/ruído)
        sublinear_tf = True,     # Escala logarítmica para atenuar repetições exageradas de termos
    )

    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    num_termos = len(vectorizer.vocabulary_)
    print(f"   ✓ Vocabulário gerado: {num_termos:,} termos e pares de termos únicos.")
    print(f"   ✓ Matriz de Treino: {X_train_vec.shape[0]:,} linhas × {X_train_vec.shape[1]:,} colunas.")
    return X_train_vec, X_test_vec, y_train, y_test, vectorizer

def train_and_evaluate_model(X_train_vec, X_test_vec, y_train, y_test, vectorizer):
  
    print("\n🧠 Treinando o modelo Multinomial Naive Bayes (MultinomialNB)...")
    model = MultinomialNB(alpha=0.1)  # Suavização de Laplace para lidar com palavras novas sem zerar probabilidades
    model.fit(X_train_vec, y_train)
    print("   ✓ Treinamento concluído com sucesso!")

    print("\n📈 Avaliando desempenho...")
    y_train_pred = model.predict(X_train_vec)
    y_test_pred = model.predict(X_test_vec)

    print("\n" + "=" * 60)
    print(f"Acurácia no treino: {accuracy_score(y_train, y_train_pred):.4f}")
    print(f"Acurácia no teste:  {accuracy_score(y_test, y_test_pred):.4f}")
    print("=" * 60)

    # Métricas detalhadas no conjunto de teste
    cm = confusion_matrix(y_test, y_test_pred)
    report = classification_report(y_test, y_test_pred, target_names=["Ham (Legítimo)", "Spam"])
    print("\n📊 Relatório de Classificação Detalhado (Teste):")
    print(report)

    print("🧩 Matriz de Confusão (Teste):")
    print(f"   [Verdadeiros Negativos] E-mails normais classificados como Normais : {cm[0][0]}")
    print(f"   [Falsos Positivos]     E-mails normais marcados como Spam (ERRO)  : {cm[0][1]}")
    print(f"   [Falsos Negativos]     Spams que passaram despercebidos (ERRO)    : {cm[1][0]}")
    print(f"   [Verdadeiros Positivos] Spams bloqueados com sucesso              : {cm[1][1]}")

    print("\n💾 Salvando o modelo e o vetorizador em disco...")
    joblib.dump(model, MODEL_OUTPUT_PATH)
    joblib.dump(vectorizer, VECTORIZER_OUTPUT_PATH)
    print(f"   ✅ Modelo salvo em     : {MODEL_OUTPUT_PATH.name}")
    print(f"   ✅ Vetorizador salvo em: {VECTORIZER_OUTPUT_PATH.name}")
    print("=" * 60)
    return model

def main():

    print("=" * 60)
    print("🚀 PIPELINE COMPLETO DE MACHINE LEARNING: DETECÇÃO DE SPAM")
    print("=" * 60)

    df = load_and_merge_datasets()
    X_train_vec, X_test_vec, y_train, y_test, vectorizer = prepare_and_vectorize_data(df)
    train_and_evaluate_model(X_train_vec, X_test_vec, y_train, y_test, vectorizer)

    print("\n🎉 Treinamento finalizado! O classificador está pronto para ser usado.")
    print("=" * 60)

if __name__ == "__main__":
    main()



