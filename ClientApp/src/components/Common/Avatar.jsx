
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar as PaperAvatar } from 'react-native-paper';

const Avatar = ({ 
  name, 
  size = 40, 
  imageUrl, 
  onPress, 
  status,
  style 
}) => {
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getRandomColor = (name) => {
    const colors = [
      '#2E7D32', '#1565C0', '#C2185B', '#FF8F00', 
      '#6A1B9A', '#00838F', '#AD1457', '#283593'
    ];
    const index = name?.length % colors.length || 0;
    return colors[index];
  };

  const avatarContent = imageUrl ? (
    <PaperAvatar.Image
      size={size}
      source={{ uri: imageUrl }}
      style={[styles.avatar, style]}
    />
  ) : (
    <View
      style={[
        styles.textAvatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getRandomColor(name),
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        {avatarContent}
        {status && (
          <View
            style={[
              styles.statusBadge,
              {
                width: size * 0.25,
                height: size * 0.25,
                borderRadius: size * 0.125,
                backgroundColor: status === 'online' ? '#4CAF50' : '#999',
              },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View>
      {avatarContent}
      {status && (
        <View
          style={[
            styles.statusBadge,
            {
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
              backgroundColor: status === 'online' ? '#4CAF50' : '#999',
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: 'transparent',
  },
  textAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default Avatar;
