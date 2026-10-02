import React, { useState } from 'react';
import { Folder, FileText, Code, FileLock, FileAudio, Save, Trash2, Plus, Search, Check } from 'lucide-react';
import { VirtualFile } from '../../types/os';
import { soundFX } from '../../audio/soundEngine';

interface Props {
  files: VirtualFile[];
  onUpdateFile: (id: string, content: string) => void;
  onCreateFile: (name: string, content: string) => void;
  onDeleteFile: (id: string) => void;
}

export const FileExplorerApp: React.FC<Props> = ({ files, onUpdateFile, onCreateFile, onDeleteFile }) => {
  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.id || '');
  const [editorContent, setEditorContent] = useState<string>(files[0]?.content || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const selectedFile = files.find(f => f.id === selectedFileId);

  const handleSelectFile = (file: VirtualFile) => {
    soundFX.playClick(900);
    setSelectedFileId(file.id);
    setEditorContent(file.content);
    setIsSaved(false);
  };

  const handleSave = () => {
    if (!selectedFile) return;
    soundFX.playSuccess();
    onUpdateFile(selectedFile.id, editorContent);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCreate = () => {
    if (!newFileName.trim()) return;
    soundFX.playSuccess();
    onCreateFile(newFileName.trim(), '# New Cyber Document\nCreated in NEON-OS 2099.\n');
    setNewFileName('');
    setIsCreating(false);
  };

  const getFileIcon = (file: VirtualFile) => {
    switch (file.category) {
      case 'classified': return <FileLock className="w-4 h-4 text-rose-400" />;
      case 'code': return <Code className="w-4 h-4 text-yellow-400" />;
      case 'document': return <FileText className="w-4 h-4 text-cyan-400" />;
      default: return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[#070b16] text-slate-100 font-sans select-none overflow-hidden">
      {/* Left Sidebar: File Tree */}
      <div className="w-64 bg-[#0c1224] border-r border-cyan-500/20 flex flex-col p-3 gap-3">
        {/* Search & New File */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-1 bg-[#060913] px-2 py-1 rounded border border-white/10 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-slate-200 outline-none font-mono text-xs w-full"
            />
          </div>
          <button
            onClick={() => {
              setIsCreating(true);
              soundFX.playClick();
            }}
            title="Create New File"
            className="p-1.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded font-bold shadow-neon-cyan"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal for new file */}
        {isCreating && (
          <div className="bg-[#12192e] p-2 rounded border border-cyan-500/30 flex flex-col gap-2">
            <span className="text-[11px] font-mono text-cyan-300">File Name:</span>
            <input
              type="text"
              placeholder="cyber_log.md"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              className="bg-[#070a14] border border-white/20 rounded px-2 py-1 text-xs font-mono outline-none text-white"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => setIsCreating(false)}
                className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500 text-black font-bold"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto space-y-1">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Folder className="w-3.5 h-3.5 text-cyan-400" />
            /ROOT DIRECTORY ({filteredFiles.length})
          </div>

          {filteredFiles.map(file => {
            const isSelected = file.id === selectedFileId;
            return (
              <button
                key={file.id}
                onClick={() => handleSelectFile(file)}
                className={`w-full flex items-center gap-2 p-2 rounded text-left transition-all border ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-neon-cyan'
                    : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-300'
                }`}
              >
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs font-bold truncate">{file.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                    <span>{file.size}</span>
                    <span>{file.category}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Cyber Text Editor & Viewer */}
      <div className="flex-1 flex flex-col bg-[#050813] overflow-hidden">
        {selectedFile ? (
          <>
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#0a0f20] border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                {getFileIcon(selectedFile)}
                <span className="font-mono text-xs font-bold text-cyan-300">{selectedFile.name}</span>
                <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                  {selectedFile.size}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs rounded shadow-neon-cyan transition-all"
                >
                  {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {isSaved ? 'SAVED' : 'SAVE FILE'}
                </button>

                <button
                  onClick={() => {
                    soundFX.playClick(400);
                    onDeleteFile(selectedFile.id);
                  }}
                  className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded border border-rose-500/30"
                  title="Delete File"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Editor Textarea */}
            <div className="flex-1 p-4 font-mono text-xs text-slate-200 select-text overflow-y-auto">
              <textarea
                value={editorContent}
                onChange={e => setEditorContent(e.target.value)}
                className="w-full h-full bg-transparent outline-none resize-none font-mono text-xs leading-relaxed text-slate-100 placeholder-slate-600"
                placeholder="Enter file contents..."
                spellCheck={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center font-mono text-xs text-slate-500">
            Select a document from the left tree.
          </div>
        )}
      </div>
    </div>
  );
};
