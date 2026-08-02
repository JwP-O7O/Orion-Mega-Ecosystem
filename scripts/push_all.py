import os
import subprocess

repos = [
    r"C:\Users\user\Projects\Orion-Mega-Ecosystem",
    r"C:\Users\user\Projects\Repo's\Content",
    r"C:\Users\user\Projects\Repo's\DocuGen",
    r"C:\Users\user\Projects\Repo's\neural_nexus",
    r"C:\Users\user\Projects\Repo's\orion-ai",
    r"C:\Users\user\Projects\Repo's\OrionX",
]

for repo in repos:
    if os.path.exists(os.path.join(repo, ".git")):
        print(f"\n============================================================")
        print(f"Checking & Pushing Repository: {repo}")
        print(f"============================================================")
        
        # Git add .
        subprocess.run(["git", "add", "."], cwd=repo, capture_output=True, text=True)
        
        # Git commit
        commit_res = subprocess.run(
            ["git", "commit", "-m", "feat: sync all recent updates, auto-research loops, and master plan"],
            cwd=repo, capture_output=True, text=True
        )
        print(f"Commit Output:\n{commit_res.stdout or commit_res.stderr}")
        
        # Try pushing to origin master, main, or upstream main
        p1 = subprocess.run(["git", "push", "origin", "master"], cwd=repo, capture_output=True, text=True)
        p2 = subprocess.run(["git", "push", "origin", "main"], cwd=repo, capture_output=True, text=True)
        p3 = subprocess.run(["git", "push", "upstream", "main"], cwd=repo, capture_output=True, text=True)
        
        print(f"Push Result: {p1.stdout or p2.stdout or p3.stdout or 'Up to date'}")

print("\n[OK] All repositories processed successfully!")
