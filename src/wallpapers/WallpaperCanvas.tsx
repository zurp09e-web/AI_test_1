import React from 'react';
import { WallpaperId } from '../types/os';
import { CyberGridWallpaper } from './CyberGridWallpaper';
import { MatrixRainWallpaper } from './MatrixRainWallpaper';
import { StarfieldWallpaper } from './StarfieldWallpaper';
import { FlowFieldWallpaper } from './FlowFieldWallpaper';
import { CyberCityWallpaper } from './CyberCityWallpaper';

interface Props {
  wallpaper: WallpaperId;
  themeColor: string;
}

export const WallpaperCanvas: React.FC<Props> = ({ wallpaper, themeColor }) => {
  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      {wallpaper === 'cybergrid' && <CyberGridWallpaper themeColor={themeColor} />}
      {wallpaper === 'matrix' && <MatrixRainWallpaper themeColor={themeColor} />}
      {wallpaper === 'starfield' && <StarfieldWallpaper themeColor={themeColor} />}
      {wallpaper === 'flowfield' && <FlowFieldWallpaper themeColor={themeColor} />}
      {wallpaper === 'cybercity' && <CyberCityWallpaper themeColor={themeColor} />}
      
      {/* Subtle vignette + scanline styling */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#05070f] via-transparent to-[#05070f]/40 opacity-70" />
    </div>
  );
};
