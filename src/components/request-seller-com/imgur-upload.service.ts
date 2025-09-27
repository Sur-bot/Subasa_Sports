import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImgurUploadService {
  private CLIENT_ID = 'YOUR_CLIENT_ID'; // 👉 thay bằng Client ID bạn lấy ở Imgur

  async upload(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        Authorization: `Client-ID ${this.CLIENT_ID}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      return result.data.link; // Trả về URL ảnh
    } else {
      throw new Error('Upload thất bại: ' + JSON.stringify(result));
    }
  }
}
