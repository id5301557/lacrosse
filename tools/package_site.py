from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
output=root/'_development/universities-github-pages.zip'
output.parent.mkdir(exist_ok=True)
folders=['aldermere','harrowgate','assets','data','shared','images','tools']
files=[root/name for name in ['index.html','README.md','.nojekyll','.gitignore']]
for folder in folders:
    files.extend(p for p in (root/folder).rglob('*') if p.is_file())
with ZipFile(output,'w',ZIP_DEFLATED) as archive:
    for file in sorted(files):archive.write(file,file.relative_to(root).as_posix())
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert all(name in archive.namelist() for name in ['index.html','data/players.js','data/schools.js','shared/app.js'])
    assert not any(name.endswith('-record.webp') or name.startswith(('.git/','_development/')) for name in archive.namelist())
    print(f'PASS: {len(archive.namelist())} site/tool files packaged; Git history, source photos and backups excluded.')
