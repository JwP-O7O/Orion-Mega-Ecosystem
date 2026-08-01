import os
import shutil

base = r"C:\Users\user\Projects\Orion-Mega-Ecosystem"
repos = r"C:\Users\user\Projects\Repo's"

dirs = [
    os.path.join(base, "apps", "trading_quant"),
    os.path.join(base, "apps", "content_agents"),
    os.path.join(base, "apps", "docu_gen"),
    os.path.join(base, "apps", "orion_brain"),
    os.path.join(base, "core", "orchestrator"),
    os.path.join(base, "core", "llm"),
    os.path.join(base, "core", "security"),
    os.path.join(base, "deploy", "vps"),
    os.path.join(base, "deploy", "gcp"),
    os.path.join(base, "scripts"),
    os.path.join(base, "tests"),
    os.path.join(base, "docs"),
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    print(f"Created: {d}")

def robust_copy(src_dir, dst_dir):
    if not os.path.exists(src_dir):
        print(f"Directory not found: {src_dir}")
        return
    print(f"Copying from {src_dir} to {dst_dir}...")
    count = 0
    for root, dirs_list, files in os.walk(src_dir):
        # Filter out unwanted directories
        dirs_list[:] = [d for d in dirs_list if d not in (".git", "node_modules", "__pycache__", ".venv", "venv")]
        
        rel_path = os.path.relpath(root, src_dir)
        target_dir = os.path.join(dst_dir, rel_path) if rel_path != "." else dst_dir
        os.makedirs(target_dir, exist_ok=True)
        
        for f in files:
            if f.endswith(".pyc"):
                continue
            src_file = os.path.join(root, f)
            dst_file = os.path.join(target_dir, f)
            try:
                shutil.copy2(src_file, dst_file)
                count += 1
            except Exception as e:
                print(f"Warning copying {f}: {e}")
    print(f"Successfully copied {count} files to {dst_dir}")

robust_copy(os.path.join(repos, "neural_nexus"), os.path.join(base, "apps", "trading_quant"))
robust_copy(os.path.join(repos, "OrionX"), os.path.join(base, "apps", "trading_quant"))
robust_copy(os.path.join(repos, "Content"), os.path.join(base, "apps", "content_agents"))
robust_copy(os.path.join(repos, "DocuGen"), os.path.join(base, "apps", "docu_gen"))
robust_copy(os.path.join(repos, "orion-ai"), os.path.join(base, "apps", "orion_brain"))

print("Migration completed successfully!")
