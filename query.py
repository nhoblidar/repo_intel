import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def query_repo(collection, question):
    results = collection.query(query_texts=[question], n_results=5)
    context = ""
    sources = []
    for i, doc in enumerate(results["documents"][0]):
        path = results["metadatas"][0][i]["path"]
        context += f"\n--- File: {path} ---\n{doc}\n"
        if path not in sources:
            sources.append(path)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": (
                "You are a helpful code assistant analyzing a GitHub repository.\n\n"
                "Based on the following code snippets, answer the question clearly.\n\n"
                f"CODE CONTEXT:\n{context}\n\n"
                f"QUESTION: {question}\n\n"
                "Provide a clear, helpful answer and mention which files are relevant."
            )
        }]
    )
    return {"answer": response.choices[0].message.content, "sources": sources}


def summarize_repo(owner, repo, repo_info, commits, prs):
    """
    Works with both:
    - raw GitHub API response  (commits have c['commit']['message'])
    - pre-processed dicts      (commits have c['message'])
    """
    def commit_line(c):
        if isinstance(c, dict) and 'commit' in c:
            msg    = c['commit'].get('message', '')[:80]
            author = c['commit'].get('author', {}).get('name', 'unknown')
        else:
            msg    = str(c.get('message', ''))[:80]
            author = c.get('author', 'unknown')
        return f"- {msg} by {author}"

    def pr_line(p):
        if isinstance(p, dict) and 'user' in p:
            return f"- [{p.get('state','')}] {p.get('title','')} by {p['user'].get('login','unknown')}"
        return f"- [{p.get('state','')}] {p.get('title','')} by {p.get('author','unknown')}"

    commit_text = "\n".join(commit_line(c) for c in (commits[:5] if isinstance(commits, list) else []))
    pr_text     = "\n".join(pr_line(p)     for p in (prs[:5]     if isinstance(prs, list) else []))

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": (
                "Summarize this GitHub repository in 3-4 sentences for a developer who has never seen it.\n\n"
                f"Repo: {owner}/{repo}\n"
                f"Description: {repo_info.get('description', 'No description')}\n"
                f"Language: {repo_info.get('language', 'Unknown')}\n"
                f"Stars: {repo_info.get('stargazers_count', 0)}\n\n"
                f"Recent commits:\n{commit_text}\n\n"
                f"Recent PRs:\n{pr_text}\n\n"
                "Give a clear, concise summary of what this project does and its current activity."
            )
        }]
    )
    return response.choices[0].message.content
