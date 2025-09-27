import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from './UserService';
import { Subscription } from 'rxjs';

@Component({
    selector: 'FloatingMenuComponent',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './floating-menu.html',
    styleUrls: ['./floating-menu.css']
})
export class FloatingMenuComponent {
    isOpen = false;
    isSeller = false;
    private sub?: Subscription;

    actions = [
        { icon: 'fas fa-plus', label: 'Tạo sản phẩm', onClick: () => alert('Tạo sản phẩm') },
        { icon: 'fas fa-edit', label: 'Điều chỉnh sản phẩm', onClick: () => alert('Điều chỉnh sản phẩm') },
        { icon: 'fas fa-trash', label: 'Xóa sản phẩm', onClick: () => alert('Xóa sản phẩm') },
        { icon: 'fas fa-coins', label: 'Xem doanh thu', onClick: () => alert('Xem doanh thu') }
    ];

    toggleMenu() {
        this.isOpen = !this.isOpen;
    }

    getButtonStyle(index: number) {
        const distance = 80; // khoảng cách giữa các nút
        return {
            transform: this.isOpen
                ? `translate(${-distance * (index + 1)}px, 0)` // bung sang trái
                : 'translate(0,0)',
            transitionDelay: `${index * 0.1}s`
        };
    }
    constructor(private userService: UserService) { }

    ngOnInit() {
        this.sub = this.userService.role$.subscribe((role) => {
            this.isSeller = (role === 'seller'  );
        });
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }

}
