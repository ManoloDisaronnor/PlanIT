import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild, AfterViewInit, OnInit, NgZone } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';
import { apiUrl } from '../../../../../../config/config';
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';
import { LoadinganimationComponent } from "../../../../components/loadinganimation/loadinganimation.component";
import { InfodialogComponent } from "../../../../components/infodialog/infodialog.component";

@Component({
  selector: 'app-groups-create',
  imports: [ReactiveFormsModule, LucideAngularModule, CommonModule, FormsModule, LoadinganimationComponent, InfodialogComponent],
  templateUrl: './groups-create.component.html',
  styleUrl: './groups-create.component.css'
})
export class GroupsCreateComponent implements AfterViewInit, OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() openCamara = new EventEmitter<void>();
  createGroupForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    imageUrl: new FormControl('')
  });
  selectedMembers: any[] = [];

  groupNameErorr: string | null = null;
  groupDescriptionError: string | null = null;
  groupMembersError: string | null = null;
  helperTextVisible: string | null = null;

  showImageActionsMenu: boolean = false;
  previewImage: string = '';
  imageFile: File | null = null;

  currentStep: number = 1;

  searchFriend: string = '';
  private searchDebouncer = new Subject<string>();
  private searchSubscription: Subscription;


  nameMaxLength = 50;
  descriptionMaxLength = 500;
  minTextareaHeight = 20;
  maxTextareaHeight = 80;
  textareaLineHeight = 20;
  previousContentHeight = 0;

  friendsLoading: boolean = false;
  friendsList: any[] = [];
  friendsOffset: number = 0;
  friendsLimit: number = 5;
  noMoreFriends: boolean = false;
  generalError: string | null = null;
  userUid: string | null = null;
  apiUrl: string = apiUrl;

  constructor(private ngZone: NgZone) {
    this.searchSubscription = this.searchDebouncer.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.friendsOffset = 0;
      this.friendsList = [];
      this.noMoreFriends = false;
      this.fetchFriends(true);
    });
  }

  @ViewChild('menuContainer') menuContainer!: ElementRef;
  @ViewChild('descriptionTextarea') descriptionTextarea!: ElementRef;

  async ngOnInit() {
    await this.getUserId();
    this.createGroupForm.valueChanges.subscribe(() => {
      this.handleFormChanges();
    });
  }

  async getUserId(): Promise<void> {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.userUid = userData.uid;
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          this.userUid = userData.uid;
        }
      }
    }
  }

  private handleFormChanges() {
    if (this.currentStep === 1) {
      if (!this.createGroupForm.controls.name.invalid) {
        this.groupNameErorr = null;
      } else if (this.createGroupForm.controls.name.hasError('required')) {
        this.groupNameErorr = 'Campo obligatorio';
      }
    } else {
      if (this.selectedMembers.length > 0) {
        this.groupMembersError = null;
      } else {
        this.groupMembersError = 'Al menos un integrante';
      }
    }
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.initializeTextarea();
        if (this.descriptionTextarea?.nativeElement) {
          const textarea = this.descriptionTextarea.nativeElement;
          textarea.addEventListener('input', () => {
            this.ngZone.run(() => this.adjustTextareaHeight());
          });
          this.ngZone.run(() => {
            this.createGroupForm.get('description')?.valueChanges.subscribe(() => {
              setTimeout(() => this.adjustTextareaHeight(), 0);
            });
          });
        }
      });
    });
  }

  initializeTextarea() {
    if (this.descriptionTextarea) {
      const textarea = this.descriptionTextarea.nativeElement;
      textarea.style.height = `${this.minTextareaHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }

  adjustTextareaHeight() {
    if (this.descriptionTextarea) {
      const textarea = this.descriptionTextarea.nativeElement;
      const value = textarea.value;

      if (!value.trim()) {
        textarea.style.height = `${this.minTextareaHeight}px`;
        textarea.style.overflowY = 'hidden';
        return;
      }

      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(computedStyle.lineHeight) || this.textareaLineHeight;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
      const lines = value.split('\n');
      let textLines = 0;

      for (let line of lines) {
        const textWidth = textarea.clientWidth - 20;
        const charsPerLine = Math.floor(textWidth / 8);

        if (charsPerLine <= 0) {
          textLines += 1;
        } else {
          textLines += Math.ceil(line.length / charsPerLine) || 1;
        }
      }

      const contentHeight = (textLines * lineHeight) + paddingTop + paddingBottom;
      textarea.style.height = `${this.minTextareaHeight}px`;
      const scrollHeight = textarea.scrollHeight;
      const requiredHeight = Math.max(this.minTextareaHeight, Math.min(contentHeight, scrollHeight));
      const newHeight = Math.min(requiredHeight, this.maxTextareaHeight);
      if (Math.abs(parseFloat(textarea.style.height) - newHeight) > 2) {
        textarea.style.height = `${newHeight}px`;
      }
      textarea.style.overflowY = scrollHeight > this.maxTextareaHeight ? 'auto' : 'hidden';
    }
  }

  onCloseModal() {
    this.closeModal.emit();
  }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showImageActionsMenu = !this.showImageActionsMenu;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.showImageActionsMenu && this.menuContainer && !this.menuContainer.nativeElement.contains(event.target)) {
      this.showImageActionsMenu = false;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress(event: KeyboardEvent) {
    this.showImageActionsMenu = false;
  }
  get nameRemainingChars(): number {
    const currentLength = this.createGroupForm.get('name')?.value?.length || 0;
    return this.nameMaxLength - currentLength;
  }
  get descriptionRemainingChars(): number {
    const currentLength = this.createGroupForm.get('description')?.value?.length || 0;
    return this.descriptionMaxLength - currentLength;
  }
  getCounterColor(remainingChars: number, maxLength: number): string {
    const percentage = (remainingChars / maxLength) * 100;

    if (percentage <= 5) {
      return '#ff0000';
    } else if (percentage <= 10) {
      return '#ff4d4d';
    } else {
      return '#a0a0d8';
    }
  }

  shouldShowCounter(remainingChars: number, maxLength: number): boolean {
    const percentage = (remainingChars / maxLength) * 100;
    return percentage <= 25;
  }

  handleWebcamImage(dataUrl: string) {
    this.previewImage = dataUrl;
    this.imageFile = this.dataURLtoFile(dataUrl, 'webcam_capture.jpg');
    this.showImageActionsMenu = false;
  }

  private dataURLtoFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }

  handleImageChange(event: any) {
    const file = event.target.files[0];
    this.imageFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl as string;
        this.previewImage = base64;
      };
      reader.readAsDataURL(file);
    }
    this.showImageActionsMenu = false;
  }

  handleDeleteImage() {
    this.previewImage = '';
    this.imageFile = null;
    this.showImageActionsMenu = false;
  }

  private base64ToFile(base64: string, filename: string): File {
    return this.dataURLtoFile(base64, filename);
  }

  showHelperText(field: string) {
    this.helperTextVisible = field;
  }

  hideHelperText() {
    this.helperTextVisible = null;
  }

  async handleFirstChanges(event: any) {
    event.preventDefault();
    if (!this.createGroupForm.controls.name.invalid) {
      this.currentStep = 2;
    } else {
      if (this.createGroupForm.controls.name.hasError('required')) {
        this.groupNameErorr = 'Campo obligatorio';
      }
    }
  }

  goBack() {
    this.currentStep = 1;
  }

  onSearchUserChange(): void {
    this.searchDebouncer.next(this.searchFriend);
  }

  async fetchFriends(reset: boolean = false, reloaded: boolean = false): Promise<void> {
    if (this.friendsLoading || this.noMoreFriends && !reloaded) return;

    this.friendsLoading = true;
    try {
      const response = await fetch(`${apiUrl}api/friends?limit=${this.friendsLimit}&offset=${this.friendsOffset}&search=${this.searchFriend}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        const datos = data.datos;
        datos.forEach((friend: any) => {
          if (friend.user_requested === this.userUid) {
            if (this.selectedMembers.find(member => member.id === friend.user_send)) {
              friend.checked = true;
            }
          } else {
            if (this.selectedMembers.find(member => member.id === friend.user_requested)) {
              friend.checked = true;
            }
          }
        });
        const newFriends = datos;

        if (reset) {
          this.friendsList = newFriends;
          this.friendsOffset = newFriends.length;
        } else {
          this.friendsList = [...this.friendsList, ...newFriends];
          this.friendsOffset += newFriends.length;
        }

        if (newFriends.length < this.friendsLimit) {
          this.noMoreFriends = true;
        }
      }
    } catch (error) {
      this.showFetchError('Error al cargar amigos: ' + error);
    } finally {
      this.friendsLoading = false;
    }
  }

  showFetchError(message: string) {
    this.generalError = message;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  startCamara() {
    this.showImageActionsMenu = false;
    this.openCamara.emit();
  }

  onFriendSelect(friend: any): void {
    const userId = friend.user_requested !== this.userUid ? friend.user_requested : friend.user_send;
    const user = friend.user_requested !== this.userUid ? friend.user_requested_user : friend.user_send_user;

    if (friend.checked) {
      const existingIndex = this.selectedMembers.findIndex(member =>
        member.id === userId);

      if (existingIndex === -1) {
        this.selectedMembers.push({
          id: userId,
          name: user.name,
          surname: user.surname,
          username: user.username,
          imageUrl: user.imageUrl
        });
      }
    } else {
      this.selectedMembers = this.selectedMembers.filter(member =>
        member.id !== userId);
    }
    if (this.selectedMembers.length > 0) {
      this.groupMembersError = null;
    }
  }

  removeMember(memberId: string): void {
    this.selectedMembers = this.selectedMembers.filter(member =>
      member.id !== memberId);
    this.friendsList.forEach(friend => {
      const friendId = friend.user_requested !== this.userUid ? friend.user_requested : friend.user_send;
      if (friendId === memberId) {
        friend.checked = false;
      }
    });

    if (this.selectedMembers.length === 0) {
      this.groupMembersError = 'Al menos un integrante';
    }
  }
  isMemberSelected(friendId: string): boolean {
    return this.selectedMembers.some(member => member.id === friendId);
  }

  onScroll(event: any): void {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;

    if (atBottom && !this.friendsLoading && !this.noMoreFriends) {
      this.fetchFriends();
    }
  }

  async handleSubmit(event: any) {
    event.preventDefault();
    if (!this.createGroupForm.controls.name.invalid) {
      this.groupNameErorr = null;
      if (this.selectedMembers.length > 0) {
        this.groupMembersError = null;
        console.log('Nombre del grupo:', this.createGroupForm.controls.name.value);
        console.log('Descripción del grupo:', this.createGroupForm.controls.description.value);
        console.log('Miembros seleccionados:', this.selectedMembers);
        try {
          const formData = new FormData();
          if (this.previewImage !== '') {
            const file = this.base64ToFile(this.previewImage, 'group.jpg');
            formData.append('groupImage', file);
          }
          formData.append('name', this.createGroupForm.controls.name.value!!);
          formData.append('description', this.createGroupForm.controls.description.value!!);
          this.selectedMembers.push({
            id: this.userUid
          })
          formData.append('members', JSON.stringify(this.selectedMembers));
          const response = await fetch(`${apiUrl}api/grupos/create`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          
          const data = await response.json();
          if (response.ok) {
            this.closeModal.emit();
            window.location.href = '/home/groups/chat/' + data.datos.id;
          }

        } catch (error: any) {
          console.error('Error al crear el grupo:', error);
          this.showFetchError('Error al crear el grupo: ' + error.message);
        }
      } else {
        this.groupMembersError = 'Al menos un integrante';
      }
    } else {
      if (this.createGroupForm.controls.name.hasError('required')) {
        this.groupNameErorr = 'Campo obligatorio';
      }
      this.currentStep = 1;
    }
  }
}