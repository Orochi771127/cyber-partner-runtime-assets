import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const value=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const source=path.resolve(value('--source')||'source');
const output=path.resolve(value('--out')||path.join(root,'site'));
const config=JSON.parse(fs.readFileSync(path.join(root,'config/source.json'),'utf8'));
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim();
const version=config.versions.find(item=>item.commit===commit);
if(!version)throw Error('SOURCE_COMMIT_NOT_APPROVED');
if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim())throw Error('SOURCE_TRACKED_FILES_CHANGED');
const payload=path.join(source,'dist/github-playtest');
// Run the existing payload verifier before selecting any public file.
execFileSync(process.execPath,['scripts/assert-public-payload.mjs',payload],{cwd:source,stdio:'inherit'});
if(config.assetPrefix!=='assets/production/characters/')throw Error('UNEXPECTED_PUBLIC_PREFIX');
const input=path.join(payload,config.assetPrefix);
const dest=path.join(output,'v',commit);
if(fs.existsSync(dest))throw Error('REFUSE_TO_OVERWRITE_VERSION');
const files=[];
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
  const absolute=path.join(dir,entry.name);
  if(entry.isSymbolicLink())throw Error('SYMLINK_NOT_ALLOWED');
  if(entry.isDirectory()){walk(absolute);continue;}
  if(!entry.isFile())throw Error('NON_FILE_IN_PAYLOAD');
  const relative=path.relative(payload,absolute).split(path.sep).join('/');
  if(!relative.startsWith(config.assetPrefix)||relative.includes('..'))throw Error('INVALID_ASSET_PATH');
  const bytes=fs.readFileSync(absolute);
  const target=path.join(dest,relative);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,bytes,{flag:'wx'});
  files.push({path:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
}
walk(input);
files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
if(files.length===0)throw Error('EMPTY_CHARACTER_PAYLOAD');
const manifest={schemaVersion:1,sourceRepository:config.repository,sourceCommit:commit,generatedAt:version.committedAt,assetPrefix:config.assetPrefix,fileCount:files.length,totalBytes:files.reduce((n,f)=>n+f.bytes,0),files};
fs.writeFileSync(path.join(dest,'runtime-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(output,'.nojekyll'),'');
const versions=fs.readdirSync(path.join(output,'v')).sort();
const body=versions.map(v=>`<li><a href="v/${v}/runtime-manifest.json">${v}</a></li>`).join('');
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cyber Partner Runtime Assets</title><style>body{max-width:56rem;margin:3rem auto;padding:0 1rem;font:16px/1.6 system-ui;color:#182433}code{overflow-wrap:anywhere}li{overflow-wrap:anywhere}a{color:#0969da}</style><h1>Cyber Partner Runtime Assets</h1><p>Versioned character files used by the public Cyber Partner: Tournament playtest.</p><p>Production sources, reference artwork and candidates are kept in the private animation repository.</p><h2>Published versions</h2><ul>${body}</ul></html>\n`);
let siteBytes=0;function measure(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())measure(p);else siteBytes+=fs.statSync(p).size;}}measure(output);
if(siteBytes>1_000_000_000)throw Error(`PAGES_SITE_TOO_LARGE:${siteBytes}`);
console.log(JSON.stringify({status:'PUBLIC_CHARACTER_SNAPSHOT_BUILT',sourceCommit:commit,fileCount:files.length,assetBytes:manifest.totalBytes,siteBytes,manifestSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dest,'runtime-manifest.json'))).digest('hex')}));
