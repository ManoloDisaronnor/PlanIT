import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-infodialog',
  imports: [LucideAngularModule, CommonModule],
  templateUrl: './infodialog.component.html',
  styleUrl: './infodialog.component.css'
})
export class InfodialogComponent {
  @Input() type: string = '';
  @Input() message: string = '';


}
