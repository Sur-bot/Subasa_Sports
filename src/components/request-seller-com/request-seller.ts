import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-request-seller',
    standalone: true,
    templateUrl: './request-seller.html',
    styleUrls: ['./request-seller.css'],
    imports: [FormsModule, CommonModule],
})
export class RequestSellerComponent {
    @Input() role: string | null = null;
    @Output() closed = new EventEmitter<void>();

    private auth = inject(Auth);
    private firestore = inject(Firestore);

    constructor(private cdr: ChangeDetectorRef) { }

    isOpen = false;
    loading = false;

    form = {
        fullName: '',
        phone: '',
        address: '',
        bankAccount: '',
        cccdFront: '',
        cccdBack: ''
    };

    files: { front?: File; back?: File } = {};

    togglePopup() {
        this.isOpen = !this.isOpen;
        if (!this.isOpen) this.resetForm();
    }

    private resetForm() {
        this.form = {
            fullName: '',
            phone: '',
            address: '',
            bankAccount: '',
            cccdFront: '',
            cccdBack: ''
        };
        this.files = {};
        this.loading = false;
    }

    onFileSelected(event: any, type: 'front' | 'back') {
        const file = event.target.files[0];
        if (file) {
            this.files[type] = file;
        }
    }

    async uploadImage(file: File): Promise<string> {
        const url = `https://api.cloudinary.com/v1_1/dyr0gm9zc/image/upload`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'Subasa_Sports'); // upload preset bạn đã tạo

        const res = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) throw new Error('Upload thất bại');

        const data = await res.json();
        return data.secure_url; // link ảnh đã upload
    }

    async submitForm() {
        const user = this.auth.currentUser;
        if (!user) {
            alert('Bạn cần đăng nhập để gửi yêu cầu!');
            return;
        }

        if (!this.files.front || !this.files.back) {
            alert('Vui lòng tải lên ảnh CCCD mặt trước và sau');
            return;
        }

        this.loading = true;
        try {
            // Upload ảnh lên Cloudinary
            this.form.cccdFront = await this.uploadImage(this.files.front!);
            this.form.cccdBack = await this.uploadImage(this.files.back!);

            // Lưu Firestore
            await setDoc(doc(this.firestore, 'sellerRequests', user.uid), {
                uid: user.uid,
                email: user.email,
                fullName: this.form.fullName,
                phone: this.form.phone,
                address: this.form.address,
                bankAccount: this.form.bankAccount,
                cccdFrontUrl: this.form.cccdFront,
                cccdBackUrl: this.form.cccdBack,
                status: 'pending',
                createdAt: new Date(),
            });

            alert('Đã gửi yêu cầu trở thành Seller!');
            this.isOpen = false;
            this.resetForm();
            this.closed.emit();
            this.cdr.detectChanges();
        } catch (err) {
            console.error(err);
            alert('Có lỗi xảy ra, vui lòng thử lại!');
        } finally {
            this.loading = false;
        }
    }
}
