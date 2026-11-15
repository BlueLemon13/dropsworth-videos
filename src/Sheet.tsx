import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

// Contact sheet for picking b-roll: numbered grid of images.
export const Sheet: React.FC<{files: string[]}> = ({files}) => (
  <AbsoluteFill style={{background: '#222', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start'}}>
    {files.map((f, i) => (
      <div key={f} style={{width: 216, height: 384, position: 'relative', border: '2px solid #222', boxSizing: 'border-box'}}>
        <Img src={staticFile(f.startsWith('bvideo/') ? f : `broll/${f}`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        <div style={{position: 'absolute', top: 4, left: 4, background: '#000', color: '#ff0', font: 'bold 30px sans-serif', padding: '0 8px'}}>{i}</div>
      </div>
    ))}
  </AbsoluteFill>
);
