export type AppId = 
  | 'synthdeck' 
  | 'neonracer' 
  | 'quantumsand' 
  | 'neuralnexus' 
  | 'chromalab' 
  | 'cyberterminal' 
  | 'hologram' 
  | 'files' 
  | 'settings';

export interface WindowState {
  id: string;
  appId: AppId;
  title: string;
  iconName: string;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  params?: Record<string, any>;
}

export type ThemeId = 'cyberpunk' | 'matrix' | 'synthwave' | 'tokyonight' | 'arctic';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  primary: string; // Hex or CSS color
  secondary: string;
  accent: string;
  bg: string;
  glowClass: string;
  badge: string;
}

export type WallpaperId = 'cybergrid' | 'matrix' | 'starfield' | 'flowfield' | 'cybercity';

export interface AppMetadata {
  id: AppId;
  name: string;
  description: string;
  iconName: string;
  category: 'audio' | 'games' | 'simulation' | 'creative' | 'system' | 'tools';
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  badge?: string;
  shortcutOnDesktop?: boolean;
}

export interface VirtualFile {
  id: string;
  name: string;
  path: string;
  extension: 'txt' | 'md' | 'log' | 'json' | 'sh' | 'dat' | 'audio';
  content: string;
  size: string;
  category: 'document' | 'system' | 'log' | 'code' | 'classified';
  updatedAt: string;
  readOnly?: boolean;
}

export interface OSNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert' | 'cyber';
  timestamp: string;
  read?: boolean;
}

export interface SystemMetrics {
  cpuUsage: number;
  gpuUsage: number;
  ramUsage: number;
  ramTotal: number;
  ramUsed: number;
  temperature: number;
  networkUp: number;
  networkDown: number;
  neuralLoad: number;
  coreTemp: number;
  uptime: number;
}
