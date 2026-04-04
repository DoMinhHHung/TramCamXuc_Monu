import React from 'react';
import {
  MaterialIcons,
  AntDesign,
  Feather,
  MaterialCommunityIcons,
  Ionicons,
  Foundation,
  Entypo,
} from '@expo/vector-icons';

export type IconSet =
  | 'MaterialIcons'
  | 'AntDesign'
  | 'Feather'
  | 'MaterialCommunityIcons'
  | 'Ionicons'
  | 'Foundation'
  | 'Entypo';

interface AppIconProps {
  set: IconSet;
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export const AppIcon: React.FC<AppIconProps> = ({ set, name, size = 24, color = '#fff', style }) => {
  const props = { name: name as any, size, color, style };
  switch (set) {
    case 'MaterialIcons': return <MaterialIcons {...props} />;
    case 'AntDesign': return <AntDesign {...props} />;
    case 'Feather': return <Feather {...props} />;
    case 'MaterialCommunityIcons': return <MaterialCommunityIcons {...props} />;
    case 'Ionicons': return <Ionicons {...props} />;
    case 'Foundation': return <Foundation {...props} />;
    case 'Entypo': return <Entypo {...props} />;
    default: return <MaterialIcons {...props} />;
  }
};
