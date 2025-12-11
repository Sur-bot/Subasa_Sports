import { Component, EventEmitter, Input, Output, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from './UserService';
import { Subscription } from 'rxjs';
import { Firestore, collection, query, where, getDocs, doc, deleteDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ProductFormComponent } from '../product-com/ProductFormComponent';
import { HttpClientModule } from '@angular/common/http'
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';

@Component({
  selector: 'FloatingMenuComponent',
  standalone: true,
  imports: [CommonModule, ProductFormComponent, HttpClientModule, FormsModule],
  templateUrl: './floating-menu.html',
  styleUrls: ['./floating-menu.css']
})
export class FloatingMenuComponent {
  isOpen = false;
  isSeller = false;
  private sub?: Subscription;

  showProductModal = false;
  showEditModal = false;
  showDeleteModal = false;
  loadingProducts = false;
  showRevenueModal = false;

  myProducts: any[] = [];
  selectedProduct: any = null;

  @Input() productList: any[] = [];
  @Output() productChange = new EventEmitter<any>();

  actions = [
    { icon: 'fas fa-plus', label: 'Tạo sản phẩm', onClick: () => this.openProductModal() },
    { icon: 'fas fa-edit', label: 'Điều chỉnh sản phẩm', onClick: () => this.openEditProducts() },
    { icon: 'fas fa-trash', label: 'Xóa sản phẩm', onClick: () => this.openDeleteProducts() },
    { icon: 'fas fa-coins', label: 'Xem doanh thu', onClick: () => this.openRevenueModal() }
  ];

  constructor(
    private userService: UserService,
    private firestore: Firestore,
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.sub = this.userService.role$.subscribe((role) => {
      this.isSeller = (role === 'seller');
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  getButtonStyle(index: number) {
    const distance = 80;
    return {
      transform: this.isOpen
        ? `translate(${-distance * (index + 1)}px, 0)`
        : 'translate(0,0)',
      transitionDelay: `${index * 0.1}s`
    };
  }

  openProductModal() {
    this.selectedProduct = null;
    this.showProductModal = true;
    this.isOpen = false;
  }

  closeProductModal() {
    this.showProductModal = false;
    this.selectedProduct = null;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
  }

  openRevenueModal() {
    this.loadRevenue();
    this.showRevenueModal = true;
  }

  closeRevenueModal() {
    this.showRevenueModal = false;
  }

  async openEditProducts() {
    await this.loadMyProducts();
    this.showEditModal = true;
    this.showDeleteModal = false;
  }

  async openDeleteProducts() {
    this.showEditModal = false;
    await this.loadMyProducts();
    this.showDeleteModal = true;
  }

  private async loadMyProducts() {
    this.isOpen = false;
    this.loadingProducts = true;
    this.myProducts = [];
    this.cdr.markForCheck();

    const currentUser = this.auth.currentUser;
    if (!currentUser?.email) {
      alert('Bạn cần đăng nhập bằng email.');
      this.loadingProducts = false;
      this.cdr.markForCheck();
      return;
    }

    const productRef = collection(this.firestore, 'products');
    const q = query(productRef, where('ownerEmail', '==', currentUser.email));
    const snap = await getDocs(q);

    this.ngZone.run(() => {
      this.myProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.loadingProducts = false;
      this.cdr.markForCheck();
    });
  }

  selectProductForEdit(product: any) {
    this.selectedProduct = product;
    this.showEditModal = false;
    this.showProductModal = true;
  }

  async deleteProduct(product: any) {
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${product.productName}"?`)) return;

    try {
      await deleteDoc(doc(this.firestore, 'products', product.id));
      this.myProducts = this.myProducts.filter(p => p.id !== product.id);
      alert('Xóa thành công!');
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Lỗi khi xóa:', err);
      alert('Có lỗi xảy ra khi xóa sản phẩm.');
    }
  }

  revenueData: any[] = [];
  totalRevenue = 0;
  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();
  fullYearData: any[] = [];
  chartData: any[] = [];

  async loadRevenue() {
    const currentUser = this.auth.currentUser;
    if (!currentUser?.email) {
      alert("Bạn cần đăng nhập bằng email.");
      return;
    }

    const ordersRef = collection(this.firestore, 'orders');
    const q = query(ordersRef, where("items", "!=", null));
    const snap = await getDocs(q);

    const listForTable: any[] = [];
    const listForChart: any[] = [];

    snap.forEach(docSnap => {
      const data: any = docSnap.data();
      if (data.status !== 'delivered') return;
      const items: any[] = data.items || [];
      const createdAt = data.createdAt?.toDate?.() || new Date();

      items.forEach(item => {
        if (item.ownerEmail !== currentUser.email) return;
        
        const entry = {
          dateRaw: createdAt,
          date: this.formatDate(createdAt),                               
          dateText: createdAt.toLocaleDateString(),      
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          amount: item.price * item.quantity
        };

        if (createdAt.getFullYear() === this.filterYear) {
          listForChart.push(entry);
        }

        if (
          createdAt.getMonth() + 1 === this.filterMonth &&
          createdAt.getFullYear() === this.filterYear
        ) {
          listForTable.push(entry);
        }
      });
    });

    this.revenueData = listForTable;
    this.fullYearData = listForChart;
    this.chartData = listForChart;

    this.totalRevenue = listForTable.reduce((s, x) => s + x.amount, 0);

    this.updateChart();
    this.cdr.markForCheck();
  }

  exportExcel() {
    const rows = this.revenueData.map(r => ({
      Ngày: this.formatDate(r.date),
      Sản_phẩm: r.productName,
      Số_lượng: r.quantity,
      Giá: r.price,
      Thành_tiền: r.amount
    }));

    rows.push({
      Ngày: "",
      Sản_phẩm: "TỔNG DOANH THU",
      Số_lượng: "",
      Giá: "",
      Thành_tiền: this.totalRevenue
    });

    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = { Sheets: { 'DoanhThu': sheet }, SheetNames: ['DoanhThu'] };
    XLSX.writeFile(wb, `DoanhThu_${this.filterMonth}_${this.filterYear}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();

    doc.text(
      this.removeVietnamese(`Bao cao doanh thu thang ${this.filterMonth}/${this.filterYear}`),
      10, 10
    );

    const rows = this.revenueData.map(r => [
      this.removeVietnamese(r.dateText),
      this.removeVietnamese(r.productName),
      r.quantity,
      r.price,
      r.amount
    ]);

    rows.push([
      "",
      this.removeVietnamese("TONG DOANH THU"),
      "",
      "",
      this.totalRevenue
    ]);

    autoTable(doc, {
      head: [[
        "Ngay", "San pham", "SL", "Gia", "Thanh tien"
      ]],
      body: rows,
      startY: 20
    });

    doc.save(`DoanhThu_${this.filterMonth}_${this.filterYear}.pdf`);
  }

  removeVietnamese(str: any) {
  if (!str) return "";     
  str = String(str);        

  return str.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d");
}
formatDate(dateString: string) {
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

  chart: any;
  viewMode: 'month' | 'week' = 'month';

  setViewMode(mode: 'month' | 'week') {
    this.viewMode = mode;
    this.updateChart();
  }

  updateChart() {
    if (this.chart) this.chart.destroy();

    const ctx: any = document.getElementById('revenueChart');

    let labels: string[] = [];
    let values: number[] = [];

    if (this.viewMode === 'month') {
      const year = this.filterYear;
      const monthlyTotals = Array(12).fill(0);

      this.fullYearData.forEach(r => {
        const d = r.dateRaw;
        if (d.getFullYear() === year) {
          monthlyTotals[d.getMonth()] += r.amount;
        }
      });

      labels = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];
      values = monthlyTotals;

    } else {

      const dailyTotals: any = {};
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = d.toLocaleDateString();
        dailyTotals[key] = 0;
      }

      this.chartData.forEach(r => {
        const key = r.dateRaw.toLocaleDateString();
        if (dailyTotals[key] !== undefined) {
          dailyTotals[key] += r.amount;
        }
      });

      labels = Object.keys(dailyTotals);
      values = Object.values(dailyTotals);
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Doanh thu',
          data: values,
          backgroundColor: '#4e73df'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: {
              stepSize: 3000000
            }
          }
        }
      }
    });
  }

  onProductChange(product: any) {
    this.selectedProduct = product;
  }
}
