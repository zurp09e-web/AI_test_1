import React, { useState, useEffect, useCallback } from 'react';
import { AppId, WindowState, ThemeId, WallpaperId, VirtualFile, OSNotification } from './types/os';
import { APP_REGISTRY, INITIAL_FILES, INITIAL_NOTIFICATIONS } from './state/useOSStore';
import { soundFX } from './audio/soundEngine';
import { WallpaperCanvas } from './wallpapers/WallpaperCanvas';
import { Desktop } from './components/Desktop';
import { WindowFrame } from './components/WindowFrame';
import { Taskbar } from './components/Taskbar';
import { StartMenu } from './components/StartMenu';
import { ContextMenu } from './components/ContextMenu';
import { NotificationCenter } from './components/NotificationCenter';

// Apps
import { SynthDeckApp } from './apps/SynthDeck/SynthDeckApp';
import { NeonRacerApp } from './apps/NeonRacer/NeonRacerApp';
import { QuantumSandApp } from './apps/QuantumSand/QuantumSandApp';
import { NeuralNexusApp } from './apps/NeuralNexus/NeuralNexusApp';
import { ChromaLabApp } from './apps/ChromaLab/ChromaLabApp';
import { CyberTerminalApp } from './apps/CyberTerminal/CyberTerminalApp';
import { HologramViewerApp } from './apps/HologramViewer/HologramViewerApp';
import { FileExplorerApp } from './apps/FileExplorer/FileExplorerApp';
import { SettingsApp } from './apps/Settings/SettingsApp';

export const App: React.FC = () => {
  // Theme & Wallpaper State
  const [theme, setTheme] = useState<ThemeId>('cyberpunk');
  const [wallpaper, setWallpaper] = useState<WallpaperId>('cybergrid');
  const [volume, setVolume] = useState<number>(0.6);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Window Management State
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [topZIndex, setTopZIndex] = useState<number>(10);

  // UI Panels
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Files & Notifications
  const [files, setFiles] = useState<VirtualFile[]>(INITIAL_FILES);
  const [notifications, setNotifications] = useState<OSNotification[]>(INITIAL_NOTIFICATIONS);

  // Theme primary color map
  const themeColors: Record<ThemeId, string> = {
    cyberpunk: '#00f0ff',
    matrix: '#00ff66',
    synthwave: '#ff007f',
    tokyonight: '#8b5cf6',
    arctic: '#38bdf8',
  };

  // Open App function
  const openApp = useCallback((appId: AppId, params?: Record<string, any>) => {
    const appMeta = APP_REGISTRY[appId];
    if (!appMeta) return;

    setWindows(prev => {
      // Check if already open
      const existing = prev.find(w => w.appId === appId);
      if (existing) {
        setActiveWindowId(existing.id);
        const newZ = topZIndex + 1;
        setTopZIndex(newZ);
        return prev.map(w => w.id === existing.id ? { ...w, isMinimized: false, zIndex: newZ } : w);
      }

      // Calculate initial position
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const w = Math.min(screenW - 40, appMeta.defaultWidth);
      const h = Math.min(screenH - 100, appMeta.defaultHeight);
      const offsetX = 40 + (prev.length % 6) * 30;
      const offsetY = 40 + (prev.length % 6) * 25;
      const x = Math.max(20, Math.min(screenW - w - 20, offsetX));
      const y = Math.max(20, Math.min(screenH - h - 60, offsetY));

      const newZ = topZIndex + 1;
      setTopZIndex(newZ);

      const newWindow: WindowState = {
        id: `win-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        appId,
        title: appMeta.name,
        iconName: appMeta.iconName,
        isMinimized: false,
        isMaximized: false,
        zIndex: newZ,
        x,
        y,
        width: w,
        height: h,
        minWidth: appMeta.minWidth || 400,
        minHeight: appMeta.minHeight || 300,
        params,
      };

      setActiveWindowId(newWindow.id);
      return [...prev, newWindow];
    });
  }, [topZIndex]);

  // Boot sequence: Open SynthDeck on initial load
  useEffect(() => {
    soundFX.playBootSound();
    openApp('synthdeck');
  }, []);

  // Global click listener to close popups
  useEffect(() => {
    const handleGlobalClick = () => {
      setIsStartOpen(false);
      setIsNotifOpen(false);
      setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Focus Window
  const focusWindow = (id: string) => {
    setActiveWindowId(id);
    const newZ = topZIndex + 1;
    setTopZIndex(newZ);
    setWindows(prev =>
      prev.map(w =>
        w.id === id ? { ...w, isMinimized: false, zIndex: newZ } : w
      )
    );
  };

  // Close Window
  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  // Minimize Window
  const minimizeWindow = (id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  // Maximize / Restore Window
  const maximizeWindow = (id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  };

  // Update Window Position / Size
  const updateWindowPosition = (id: string, x: number, y: number, width: number, height: number) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, x, y, width, height } : w))
    );
  };

  // Virtual Files CRUD
  const handleUpdateFile = (id: string, content: string) => {
    setFiles(prev =>
      prev.map(f =>
        f.id === id
          ? {
              ...f,
              content,
              size: `${(content.length / 1024).toFixed(1)} KB`,
              updatedAt: new Date().toISOString().replace('T', ' ').substr(0, 16),
            }
          : f
      )
    );
  };

  const handleCreateFile = (name: string, content: string) => {
    const newFile: VirtualFile = {
      id: `file-${Date.now()}`,
      name,
      path: `/root/${name}`,
      extension: name.endsWith('.md') ? 'md' : name.endsWith('.sh') ? 'sh' : 'txt',
      content,
      size: `${(content.length / 1024).toFixed(1)} KB`,
      category: 'document',
      updatedAt: new Date().toISOString().replace('T', ' ').substr(0, 16),
    };
    setFiles(prev => [newFile, ...prev]);
  };

  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Cycle wallpaper
  const cycleWallpaper = () => {
    const list: WallpaperId[] = ['cybergrid', 'matrix', 'starfield', 'flowfield', 'cybercity'];
    const nextIdx = (list.indexOf(wallpaper) + 1) % list.length;
    setWallpaper(list[nextIdx]);
  };

  // Cycle theme
  const cycleTheme = () => {
    const list: ThemeId[] = ['cyberpunk', 'matrix', 'synthwave', 'tokyonight', 'arctic'];
    const nextIdx = (list.indexOf(theme) + 1) % list.length;
    setTheme(list[nextIdx]);
  };

  // Render App Content inside Window
  const renderAppContent = (win: WindowState) => {
    switch (win.appId) {
      case 'synthdeck':
        return <SynthDeckApp />;
      case 'neonracer':
        return <NeonRacerApp />;
      case 'quantumsand':
        return <QuantumSandApp />;
      case 'neuralnexus':
        return <NeuralNexusApp />;
      case 'chromalab':
        return <ChromaLabApp />;
      case 'cyberterminal':
        return <CyberTerminalApp />;
      case 'hologram':
        return <HologramViewerApp />;
      case 'files':
        return (
          <FileExplorerApp
            files={files}
            onUpdateFile={handleUpdateFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
          />
        );
      case 'settings':
        return (
          <SettingsApp
            currentTheme={theme}
            currentWallpaper={wallpaper}
            onSetTheme={setTheme}
            onSetWallpaper={setWallpaper}
            volume={volume}
            onSetVolume={setVolume}
            isMuted={isMuted}
            onSetMuted={setIsMuted}
          />
        );
      default:
        return <div className="p-4 text-xs font-mono text-slate-400">Application not loaded.</div>;
    }
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden select-none bg-[#05070f] font-sans ${theme}`}>
      {/* 1. Live Animated Wallpaper Engine */}
      <WallpaperCanvas wallpaper={wallpaper} themeColor={themeColors[theme]} />

      {/* 2. Interactive Desktop Grid & Marquee */}
      <Desktop
        onOpenApp={openApp}
        onOpenContextMenu={(x, y) => setContextMenu({ x, y })}
      />

      {/* 3. Open Windows Layer */}
      {windows.map(win => (
        <WindowFrame
          key={win.id}
          window={win}
          isActive={activeWindowId === win.id && !win.isMinimized}
          onFocus={() => focusWindow(win.id)}
          onClose={() => closeWindow(win.id)}
          onMinimize={() => minimizeWindow(win.id)}
          onMaximize={() => maximizeWindow(win.id)}
          onUpdatePosition={(x, y, w, h) => updateWindowPosition(win.id, x, y, w, h)}
        >
          {renderAppContent(win)}
        </WindowFrame>
      ))}

      {/* 4. Taskbar (Fixed at bottom) */}
      <Taskbar
        windows={windows}
        activeWindowId={activeWindowId}
        isStartOpen={isStartOpen}
        onToggleStart={() => setIsStartOpen(!isStartOpen)}
        onFocusWindow={focusWindow}
        onOpenApp={openApp}
        onToggleNotifications={() => setIsNotifOpen(!isNotifOpen)}
        unreadNotifications={notifications.length}
        volume={volume}
        onSetVolume={setVolume}
        isMuted={isMuted}
        onSetMuted={setIsMuted}
      />

      {/* 5. Start Menu Popover */}
      <StartMenu
        isOpen={isStartOpen}
        onClose={() => setIsStartOpen(false)}
        onOpenApp={openApp}
        onReboot={() => {
          setWindows([]);
          setTimeout(() => openApp('synthdeck'), 500);
        }}
      />

      {/* 6. Notifications Popover */}
      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onClear={() => setNotifications([])}
        onDismiss={id => setNotifications(prev => prev.filter(n => n.id !== id))}
      />

      {/* 7. Right Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onOpenApp={openApp}
          onCycleWallpaper={cycleWallpaper}
          onCycleTheme={cycleTheme}
          onCreateNewDoc={() => {
            handleCreateFile(`doc_${Date.now().toString().slice(-4)}.md`, '# New Cyber Note\n');
            openApp('files');
          }}
        />
      )}
    </div>
  );
};
