import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

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

    form = {
        fullName: '',
        phone: '',
        address: '',
        bankAccount: ''
    };

    loading = false;

    togglePopup() {
        this.isOpen = !this.isOpen;

        // nếu đóng thì reset form
        if (!this.isOpen) {
            this.resetForm();
        }
    }

    private resetForm() {
        this.form = {
            fullName: '',
            phone: '',
            address: '',
            bankAccount: ''
        };
        this.loading = false;
    }

    async submitForm() {
        const user = this.auth.currentUser;
        if (!user) {
            alert('Bạn cần đăng nhập để gửi yêu cầu!');
            return;
        }

        this.loading = true;
        try {
            await setDoc(doc(this.firestore, 'sellerRequests', user.uid), {
                uid: user.uid,
                email: user.email,
                ...this.form,
                status: 'pending',
                createdAt: new Date()
            });


            // Đóng popup sau khi submit
            this.isOpen = false;
            this.resetForm();
            this.closed.emit();
            this.cdr.detectChanges()

        } catch (err) {
            console.error(err);
        }
        this.loading = false;
    }
}
