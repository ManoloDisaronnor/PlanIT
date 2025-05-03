import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-groups-create',
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './groups-create.component.html',
  styleUrl: './groups-create.component.css'
})
export class GroupsCreateComponent {
  @Output() closeModal = new EventEmitter<void>();
  createGroupForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    imageUrl: new FormControl(''),
    members: new FormControl<any[]>([]),
  });
  showImageActionsMenu: boolean = false;
  previewImage: string = '';

  onCloseModal() {
    this.closeModal.emit();
  }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showImageActionsMenu = !this.showImageActionsMenu;
  }

  async handleSubmit(event: any) {
    event.preventDefault();
  }
}

