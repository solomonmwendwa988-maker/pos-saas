/**
 * Reads an image file and returns a 256x256 JPEG data URL.
 * Keeps avatars small enough for localStorage.
 */
export async function fileToAvatar(file, maxSize = 256) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = maxSize;
          canvas.height = maxSize;
          const ctx = canvas.getContext('2d');
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, maxSize, maxSize);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch (err) {
          reject(new Error('Could not process image.'));
        }
      };
      img.onerror = () => reject(new Error('Could not read image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export function getInitials(name = '') {
  const trimmed = name.trim();
  if (!trimmed) return 'U';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}