import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loadinganimation',
  imports: [CommonModule],
  templateUrl: './loadinganimation.component.html',
  styleUrl: './loadinganimation.component.css'
})
export class LoadinganimationComponent {
  @Input() type: string = '';
  uibSize: string = '50px';
  uibColor: string = 'white';
  uibSpeed: string = '1.4s';

  ngOnInit() {
    switch (this.type) {
      case 'button':
        this.uibSize = '50px';
        this.uibColor = 'white';
        this.uibSpeed = '1.4s';
        break;
      case 'fullscreen':
        this.uibSize = '100px';
        this.uibColor = '#7c7cff';
        this.uibSpeed = '1.4s';
        break;
      case 'small':
        this.uibSize = '20px';
        this.uibColor = 'white';
        this.uibSpeed = '1.4s';
        break;
      case 'large':
        this.uibSize = '80px';
        this.uibColor = 'white';
        this.uibSpeed = '1.4s';
        break;
      default:
        this.uibSize = '50px';
        this.uibColor = 'white';
        this.uibSpeed = '1.4s';
        break;
    }
  }
}
