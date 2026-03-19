import { BreakpointObserver } from '@angular/cdk/layout';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { Location } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatAccordion } from '@angular/material/expansion';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { StepperOrientation } from '@angular/material/stepper';
import { Banner, BannerSize, BannerType, Client, FontType, Project, Template } from '@app/core/models';
import { AlertService, BannerCreatorService, BannerService, BannerSizeService, BannerTypeService, ClientService, FontTypeService, ProjectService, TemplateService, WebWorkerService,ContainerService } from '@app/core/services';
import { generateUUID, getCartesianProduct, groupBy, urlContentToDataUri } from '@core/utils/helper.utils';
import { ROUTER_UTILS } from '@core/utils/router.utils';
import { environment } from '@env/environment';
import * as saveAs from 'file-saver';
import * as introJs from 'intro.js';
import * as JSZip from 'jszip';
import { BehaviorSubject, combineLatest, Observable, Subject, Subscription } from 'rxjs';
import { first,map, takeUntil } from 'rxjs/operators';
import {
	BottomSheetTemplateRulesComponent,
	DialogBannerComponentAddComponent,
	DialogBannerContainerAddComponent, DialogBannerContainerAnimationAddComponent, DialogBannerContainerEditComponent
} from '@app/components';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FileUploadService } from './services/file-upload.services';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const GIF = (window as any).GIF;
export interface Tile {
	color: string;
	cols: number;
	rows: number;
	text: string;
  }

  export interface websiteTemplate {
	id:string;
	templateId?: string;
	title: any;
	subtitle: any;
	image: string;
	content: any;
	websiteHtml?: string;
	websiteCss?: string;
	websiteJs?: string;
	websiteFiles?: any[];
  }

export interface WebsiteButtonOption {
	index: number;
	label: string;
	selector: 'button' | 'div';
	key: string;
}

interface WebsiteElementComputedStyle {
	width?: string;
	height?: string;
	border?: string;
	borderRadius?: string;
	backgroundColor?: string;
}

  export interface DialogData {
	animal: string;
	name: string;
  }
  
@Component({
	selector: 'app-website',
	templateUrl: './website.page.html',
	styleUrls: ['./website.page.scss'],
	providers: [
		{
			provide: STEPPER_GLOBAL_OPTIONS,
			useValue: {
				showError: true,
				displayDefaultIndicatorType: false
			}
		},
	]
})
export class WebsitePage implements OnInit, OnDestroy {

	firstFormGroup = this._formBuilder.group({
		
	  });
	  secondFormGroup = this._formBuilder.group({
		secondCtrl: ['', Validators.required],
	  });

	@ViewChild(MatAccordion) accordion!: MatAccordion;
	@ViewChild('websitePreviewMedia') websitePreviewMediaRef?: ElementRef<HTMLElement>;
	@ViewChild('websiteButtonPopoverRef') websiteButtonPopoverRef?: ElementRef<HTMLElement>;
	// _________________________ [ websiteTemplates ]
	public selectedFiles?: FileList;
	public currentFile?: File;
	public progress = 0;
	public message = '';
	public preview = '';
  
	public imageInfos?: Observable<any>;

	public websiteSelectedTemplate = false;
	public websiteSelectedTemplateID!: any;
	public websiteButtonOptions: WebsiteButtonOption[] = [];
	public selectedWebsiteButtonIndex = 0;
	public selectedWebsiteElementSelector: 'button' | 'div' = 'button';
	public websiteButtonLabel = '';
	public websiteButtonTextColor = '#ffffff';
	public websiteButtonBackgroundColor = '#1f6f8b';
	public websiteButtonOffsetY = 0;
	public websiteDivColor = '#ffffff';
	public websiteDivWidth = '';
	public websiteDivHeight = '';
	public websiteDivBorder = '';
	public websiteDivBorderRadius = '';
	public websiteButtonEditorMessage = '';
	public showWebsiteButtonPopover = false;
	public websiteButtonPopoverX = 16;
	public websiteButtonPopoverY = 16;
	public isWebsiteButtonPopoverDragging = false;
	private websiteButtonPopoverDragStartX = 0;
	private websiteButtonPopoverDragStartY = 0;
	private websiteButtonPopoverInitialX = 0;
	private websiteButtonPopoverInitialY = 0;
	private websiteElementComputedStyles: Record<string, WebsiteElementComputedStyle> = {};

	websiteTemplates: websiteTemplate[] = [];

	// will use the _destroy$ observable to control
	// fetching items from an observable
	private _destroy$ = new Subject<boolean>();

	public path = ROUTER_UTILS.config.base;
	//_________________________________NEW DATA HERE
	public BannerId!: string;
	public isAddMode!: boolean;

	public activeContainer: any;
	public containerUpdate = false;

	// container form controls
	public formControlActiveContainer = new FormControl('');
	public formControlActiveContainerOrder = new FormControl('');
	public formControlActiveContainerDuration = new FormControl('');
	public formControlActiveContainerClickThroughURL = new FormControl('');
	public formControlActiveContainerClickThroughName = new FormControl('');

	public pageData$!: Observable<any>;
	public formDataFonts!: FontType[];
	public formDataClients!: Client[];
	public formDataBannerSizes!: BannerSize[];
	public formDataBannerTypes!: BannerType[];
	public formDataComponentType!: any[];//ComponentType[];

	public componentMetaFiles: any[] = [];

	public componentAnimations: any[] = [];

	public template!: Template;
	public componentAnimationsOutline: any[] = [];

	private TimelineInitialised = false;

	public TimelineOpen = false;
	public animationEditUI = false;
	public componentEditUI = false;
	public previewActive = false;

	public editingComponent!: any;
	public editingAnimation!: any;
	public selectedTemplateData!: any;


	//__________________________________NEW DATA END HERE
	//user onboarding
	private introJS = introJs();

	// UI Variables
	public isLinear = true;
	public panelOpenState = false;

	

	public editingComponentActionsMenu!: any;

	public generatingDownloads = false;
	public noOfVariations = 0;
	//public noOfVariationsForGeneration = 0;
	public variationsGenerated = false;
	public variationsExported = false;
	public exportingProcess = false;

	public percentage = 0;
	public completedBannerVariationCounter = 0;
	public TotalContainersForAllCreatives = 0;

	public newVariationNameValue!: FormControl;

	private variationsTracker: any[] = [];

	/* Responsive steper listener */
	stepperOrientation: Observable<StepperOrientation>;

	// FORM DATA
	public websiteData$!: Observable<any>;
	public uiDataReady = false;
	public BannerSizes!: BannerSize[];
	public BannerTypes!: BannerType[];
	public Clients!: Client[];
	public Projects!: Project[];
	public Templates!: Template[];

	private selectedClient?: Subscription;
	private selectedProject?: Subscription;
	private selectedCreativeType?: Subscription;
	private selectedProjectTemplate?: Subscription;
	private selectedProjectTemplateBanners?: Subscription;

	// Template Rules
	public TemplateRules: any[] = [];

	// Active Data for Step 1 Form Fields
	public FormGroupProjectDetails!: FormGroup;

	public activeBannerSizes: any[] = [];
	public activeTemplate!: any;
	public availableProjects: Project[] = [];
	public availableCreativeTypes: BannerType[] = [];
	public availableTemplates: Template[] = [];
	public availableBanners: Banner[] = [];

	public creativeType!: string | undefined;

	public updateableComponents: any[] = [];

	// Data for Step 2
	public FormGroupVariations!: FormControl;

	@Output() variationsEvent = new EventEmitter<any>();
	@Output() downloadVariationsEvent = new EventEmitter<any>();
	@Output() componentPositionUpdateEventfromPage = new EventEmitter<any>();
	@Input() variationCollectionForDownload!: any[];
	public variationCollectionForExport: any[] = [];

	// Filters
	private filteredData!: any[];
	public bannersizeFilterValue: any;
	//public filterDataBannerSizes: BannerSize[] = [];

	/**/
	// MatPaginator Inputs for variations pagination
	public pageLength = 0;
	public pageSize = 20;
	public currentPage = 0;
	public pageSizeOptions: number[] = [10, 20, 50, 100];
	public sortedData!: any[];
	public numberOfVer!: any[];

	// MatPaginator Output
	public pageEvent!: PageEvent;
	/**/

	// creative rendered and ready
	private creativeReadySubject: BehaviorSubject<boolean | any>;
	public creativeReadyObs: Observable<boolean | any>;

	//refresh stage
	private refreshStageSubject: BehaviorSubject<boolean>;
	public refreshStageObs: Observable<boolean>;

	//reset uploads
	private resetVariationsSubject: BehaviorSubject<any>;
	public resetVariationsObs: Observable<any>;

	//remove upload
	private removeUploadItemSubject: BehaviorSubject<any>;
	public removeUploadItemObs: Observable<any>;

	//Download GIF/HTML5
	private generateSubject: BehaviorSubject<boolean>;
	public generateObs: Observable<boolean>;

	// HTML5 animations playback controls
	public animation_isPlaying = false;
	public animation_isLooping = false;
	private playStageAnimationSubject: BehaviorSubject<any>;
	public playStageAnimationObs: Observable<any>;

	private playGlobalAnimationSubject: BehaviorSubject<boolean | null>;
	public playGlobalAnimationObs: Observable<boolean | null>;

	//loop stage animation
	private loopStageAnimationSubject: BehaviorSubject<boolean>;
	public loopStageAnimationObs: Observable<boolean>;

	//preview stage
	private previewStageSubject: BehaviorSubject<boolean | null>;
	public previewStageObs: Observable<boolean | null>;

	//unlock component
	private editableComponentsSubject: BehaviorSubject<boolean>;
	public editableComponentsObs: Observable<boolean>;

	//deleted components
	private deleteComponentSubject: BehaviorSubject<any[] | unknown>;
	public deleteComponentObs: Observable<any[] | unknown>;

	//edit components
	private unlockComponentsSubject: BehaviorSubject<any>;
	public unlockComponentObs: Observable<any>;

	// component menu actions
	private editableComponentActionMenuSubject: BehaviorSubject<any>;
	public editableComponentActionMenuObs: Observable<any>;

	// Data
	public files: any[] = [];
	private uploadedFileSubject: BehaviorSubject<any[] | unknown>;
	public uploadedFileObs: Observable<any[] | unknown>;

	//new components
	private newComponentSubject: BehaviorSubject<any[] | unknown>;
	public newComponentObs: Observable<any[] | unknown>;

	//updated components
	private updateComponentSubject: BehaviorSubject<any[] | unknown>;
	public updateComponentObs: Observable<any[] | unknown>;

	tiles: Tile[] = [
		{text: 'One', cols: 1, rows: 2, color: 'lightblue'},
		{text: 'Two', cols: 3, rows: 2, color: 'lightgreen'},
	  ];

	constructor(
		private uploadService: FileUploadService,
		private dialog: MatDialog,
		private _bottomSheet: MatBottomSheet,
		private location: Location,
		private clientService: ClientService,
		private bannerService: BannerService,
		private bannerTypeService: BannerTypeService,
		private bannerSizeService: BannerSizeService,
		private projectService: ProjectService,
		private alertService: AlertService,
		private _formBuilder: FormBuilder,
		private templateService: TemplateService,
		public breakpointObserver: BreakpointObserver,
		private bannerCreatorService: BannerCreatorService,
		private fontTypeService: FontTypeService,
		private webWorkerService: WebWorkerService,

		private containerService: ContainerService,
		private sanitizer: DomSanitizer,
	) {

		this.updateComponentSubject = new BehaviorSubject<any[] | unknown>(null);
		this.updateComponentObs = this.updateComponentSubject.asObservable(); 

		this.unlockComponentsSubject = new BehaviorSubject<boolean>(false);
		this.unlockComponentObs = this.unlockComponentsSubject.asObservable();

		this.deleteComponentSubject = new BehaviorSubject<any[] | unknown>(null);
		this.deleteComponentObs = this.deleteComponentSubject.asObservable();

		this.editableComponentsSubject = new BehaviorSubject<boolean>(false);
		this.editableComponentsObs = this.editableComponentsSubject.asObservable();


		this.previewStageSubject = new BehaviorSubject<boolean | null>(null);
		this.previewStageObs = this.previewStageSubject.asObservable();

		this.newComponentSubject = new BehaviorSubject<any[] | unknown>(null);
		this.newComponentObs = this.newComponentSubject.asObservable();

		this.editableComponentActionMenuSubject = new BehaviorSubject<boolean>(false);
		this.editableComponentActionMenuObs = this.editableComponentActionMenuSubject.asObservable();

		// Step 3 Filters
		this.bannersizeFilterValue = new FormControl('');

		this.buildForm();

		this.uploadedFileSubject = new BehaviorSubject<any[] | unknown>(null);
		this.uploadedFileObs = this.uploadedFileSubject.asObservable();

		this.refreshStageSubject = new BehaviorSubject<boolean>(false);
		this.refreshStageObs = this.refreshStageSubject.asObservable();

		this.generateSubject = new BehaviorSubject<boolean>(false);
		this.generateObs = this.generateSubject.asObservable();

		this.resetVariationsSubject = new BehaviorSubject<boolean>(false);
		this.resetVariationsObs = this.resetVariationsSubject.asObservable();

		this.removeUploadItemSubject = new BehaviorSubject<boolean>(false);
		this.removeUploadItemObs = this.removeUploadItemSubject.asObservable();

		this.creativeReadySubject = new BehaviorSubject<boolean>(false);
		this.creativeReadyObs = this.creativeReadySubject.asObservable();

		// animations
		this.playStageAnimationSubject = new BehaviorSubject<any>(null);
		this.playStageAnimationObs = this.playStageAnimationSubject.asObservable();

		this.playGlobalAnimationSubject = new BehaviorSubject<boolean | null>(null);
		this.playGlobalAnimationObs = this.playGlobalAnimationSubject.asObservable();

		this.loopStageAnimationSubject = new BehaviorSubject<boolean>(false);
		this.loopStageAnimationObs = this.loopStageAnimationSubject.asObservable();

		this.stepperOrientation = breakpointObserver
			.observe('(min-width: 800px)')
			.pipe(
				map(({ matches }) => (matches ? 'horizontal' : 'vertical')),
				takeUntil(this._destroy$)
			);

		//this.webWorkerService.downloadAllVariations(['test']);

		
	}

	// convenience getter for easy access to form fields
	get f() { return this.FormGroupProjectDetails.controls; }

	ngOnInit() {
		this.imageInfos = this.uploadService.getFiles();
		//console.log("ngOnInit");
		this.isAddMode = !this.BannerId;
		this.initialise();

		// Listen to Form Control Value Changes to dynamically populate available options
		// based on user inputs

		this.selectedClient = this.f['projectClient'].valueChanges.pipe(takeUntil(this._destroy$)).subscribe((value) => {

			if (value === undefined || value === '' || value === null) {
				this.f['projectTitle'].disable();
				this.f['projectBannerType'].disable();

				//this.f['projectTitle'].setValue('');
				this.f['projectTitle'].patchValue('');
				//this.f['projectBannerType'].patchValue('');
				//this.f['projectBannerSizes'].patchValue(false);

				//this.BannerSizes = [];
				//this.TemplateRules = [];
				//this.activeBannerSizes = [];

			} else {

				// when client changes; reset all other form fields
				this.f['projectTitle'].patchValue('');
				this.f['projectBannerType'].patchValue('');

				this.f['projectTitle'].enable();

				this.availableProjects = this.Projects.filter((x: Project) => x.clientId == value && x.status === true);
				this.availableTemplates = this.Templates.filter((x: Template) => (x.clientId == this.f['projectClient'].value && x.status === true));

				////console.log('availableTemplates', this.availableTemplates);

				//reset available creative types
				this.availableCreativeTypes.splice(0, this.availableCreativeTypes.length);

				if (this.availableProjects.length <= 0) {

					this.alertService.error('Selected Client doesn\'t have any Projects available.', { keepAfterRouteChange: true });
					this.f['projectTitle'].disable();
				} else {

					const templateBannerTypes = this.availableTemplates.map(x => x.bannertypeId);
					//const availableCreativeTypes:any[] = [];
					this.BannerTypes.forEach((x: any) => {
						if (templateBannerTypes.includes(x.id)) {
							this.availableCreativeTypes.push(x);
						}
					})

					//console.log('availableCreativeTypes', this.availableCreativeTypes);
				}

			}
		});

		this.selectedProject = this.f['projectTitle'].valueChanges.pipe(takeUntil(this._destroy$)).subscribe((value) => {

			////console.log('projectTitle:', value);

			if (value === undefined || value === '' || value === null) {

				this.f['projectBannerType'].disable();
				this.f['projectBannerType'].patchValue('');

			} else {

				this.f['projectBannerType'].enable();
			}
		});

		this.selectedCreativeType = this.f['projectBannerType'].valueChanges.pipe(takeUntil(this._destroy$)).subscribe((value) => {

			this.resetSelectedCreativeData();

			this.f['projectTemplate'].patchValue('');

			if (value === undefined || value === '' || value === null) { } else {
				const found = this.BannerTypes.find((x: any) => x.id === value)?.name;
				if (found) {
					this.creativeType = this.BannerTypes.find((x: any) => x.id === value)?.name;
				}

				/** /
				const checkTemplatesForCreativeType = this.availableTemplates.filter( (x:Template) => (x.bannertypeId === value ) );

				if( checkTemplatesForCreativeType.length <= 0 ) {

					this.alertService.error('Selected Client Project doesn\'t have any Creatives available for the selected Creative Type.', { keepAfterRouteChange: true });
					//this.f['projectTitle'].disable();
				}
				/**/

				////console.log('availableTemplates', this.availableTemplates);
			}

		});

		this.selectedProjectTemplate = this.f['projectTemplate'].valueChanges.pipe(takeUntil(this._destroy$)).subscribe((value) => {

			//console.log('projectTemplate:', value);

			if (value === undefined || value === '' || value === null) {

				//this.f['projectBannerSizes'].disable();
				this.f['projectBannerSizes'].patchValue(false);
				//this.task.subtasks.forEach(t => (t.completed = completed));

				this.resetSelectedCreativeData();
				this.resetUIControls();
				this.resetvariationsData();

				this.files = [];
				this.uploadedFileSubject.next(false);

			} else {

				this.activeTemplate = this.Templates.find(x => x.id == value);

				// available bannersizes must be based on the sizes made available by the selected template.
				this.BannerSizes = this.activeTemplate.banners.filter((x: Banner) => x.status === true).map((x: any) => x.bannersize);

				////console.log('Current JOB:', this.activeTemplate, this.BannerSizes);
			}
		});

	}
	
	ngOnDestroy(): void {
		console.warn('Website Component ngOnDestroy');
		this._destroy$.next(false);
		this._destroy$.complete();
	}

	private buildForm(): void {
		this.FormGroupProjectDetails = this._formBuilder.group({
			projectTitle: [{ value: '', disabled: true }, Validators.required],
			projectClient: [{ value: '', disabled: false }, Validators.required],
			projectBannerType: [{ value: '', disabled: true }, Validators.required],
			projectTemplate: ['', Validators.required],
			projectBannerSizes: ['', Validators.required],
			//projectBannerSizesControl: ['', Validators.required]
		});

		this.FormGroupVariations = new FormControl('', Validators.required);
	}

	private initialise(): void {
		console.info('Website Component initialise');

		this.websiteData$ = combineLatest(
			[
				this.templateService.getAll(),
				this.clientService.getAll(),
				this.bannerTypeService.getAll(),
				this.bannerSizeService.getAll(),
				this.projectService.getAll(),
				this.fontTypeService.getAll()
			]
		)
			.pipe(
				map(([templates, clients, bannertypes, bannersizes, projects, fonttypes]): any => {
					console.info('combineLatest initialise', [templates, clients, bannertypes, bannersizes, projects, fonttypes]);
					//console.log(templates.getChildByName())
					// combineLatest returns an array of values, here we map those values to an object
					return { templates, clients, bannertypes, bannersizes, projects, fonttypes };
				})
			);

		this.websiteData$
			.pipe(takeUntil(this._destroy$))
			.subscribe((data: any) => {
				this.prepWebsiteData(data);
			});

	}

	private createWebsiteTemplateField(value: string): any {
		return {
			value,
			x: 0,
			y: 0,
			z: 0,
			w: 0,
			color: '#000000',
			background: '#ffffff',
			fonts: 'fonts',
			fontType: 0,
			fontSize: 16,
		};
	}

	private getTemplatePreviewImage(template: Template): string {
		const firstBanner = template.banners?.find((banner: any) => banner?.status !== false);
		const firstContainer = firstBanner?.containers?.[0];
		const imageComponent = firstContainer?.components?.find((component: any) => component?.componenttype?.name === 'Image');
		const imagePath = imageComponent?.componentmeta?.find((meta: any) => meta?.name === 'path')?.value;

		return imagePath || 'https://material.angular.io/assets/img/examples/shiba2.jpg';
	}

	private mapTemplateToWebsiteTemplate(template: Template): websiteTemplate {
		const firstBanner: any = template.banners?.find((b: any) => b?.status !== false);
		const websiteFiles = firstBanner?.websiteFiles || firstBanner?.websitefiles || [];
		return {
			id: String(template.id),
			templateId: String(template.id),
			title: this.createWebsiteTemplateField(template.name),
			subtitle: this.createWebsiteTemplateField(template.client?.name || template.bannertype?.name || 'Website Template'),
			image: this.getTemplatePreviewImage(template),
			content: this.createWebsiteTemplateField(template.description || 'Edit this template copy and replace the image from the website editor.'),
			websiteHtml: this.getWebsitePreviewEntryContent(websiteFiles, ['index.html'], '.html', firstBanner?.websiteHtml || ''),
			websiteCss: this.getWebsitePreviewEntryContent(websiteFiles, ['css', 'style.css'], '.css', firstBanner?.websiteCss || ''),
			websiteJs: this.getWebsitePreviewEntryContent(websiteFiles, ['js', 'main.js'], '.js', firstBanner?.websiteJs || ''),
			websiteFiles,
		};
	}

	public buildPreviewDocument(t: websiteTemplate): SafeHtml {
		const head = this.extractWebsiteHead(t.websiteHtml || '');
		const html = this.normalizeWebsiteHtml(t.websiteHtml || '');
		const css = this.normalizeWebsiteCss(t.websiteCss || '');
		const js = this.normalizeWebsiteJs(t.websiteJs || '');
		const baseHref = this.getPreviewBaseHref();
		const editorBridgeJs = this.buildPreviewEditorBridgeScript(String(t.id || ''));

		return this.sanitizer.bypassSecurityTrustHtml(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${baseHref}">${head}<style>${css}</style></head><body>${html}<script>${js}<\/script><script>${editorBridgeJs}<\/script></body></html>`);
	}

	private buildPreviewEditorBridgeScript(templateId: string): string {
		const safeTemplateId = JSON.stringify(templateId);

		return `(function(){
			var MESSAGE_TYPE = 'website-preview-element-selected';
			var SELECTED_CLASS = 'website-preview-element-selected';
			var style = document.createElement('style');
			style.textContent = '.' + SELECTED_CLASS + '{outline:2px dashed #ff7a00 !important; outline-offset:2px;}';
			document.head.appendChild(style);

			function clearSelection(){
				document.querySelectorAll('.' + SELECTED_CLASS).forEach(function(node){
					node.classList.remove(SELECTED_CLASS);
				});
			}

			document.addEventListener('click', function(event){
				var target = event.target;
				if (!target || typeof target.closest !== 'function') {
					return;
				}

				var activeElement = target.closest('button, div');
				if (!activeElement) {
					return;
				}

				if (activeElement.tagName === 'DIV') {
					var divText = (activeElement.textContent || '').trim();
					if (!divText) {
						return;
					}
				}

				var elementSelector = activeElement.tagName === 'BUTTON' ? 'button' : 'div';
				var elements = Array.prototype.slice.call(document.querySelectorAll(elementSelector));
				var elementIndex = elements.indexOf(activeElement);
				if (elementIndex < 0) {
					return;
				}

				event.preventDefault();
				event.stopPropagation();
				clearSelection();
				activeElement.classList.add(SELECTED_CLASS);
				var rect = activeElement.getBoundingClientRect();
				var computed = window.getComputedStyle(activeElement);

				if (window.parent && window.parent !== window) {
					window.parent.postMessage({
						type: MESSAGE_TYPE,
						templateId: ${safeTemplateId},
						elementType: elementSelector,
						elementIndex: elementIndex,
						computedStyle: {
							width: computed.width,
							height: computed.height,
							border: computed.border,
							borderRadius: computed.borderRadius,
							backgroundColor: computed.backgroundColor
						},
						buttonRect: {
							left: rect.left,
							top: rect.top,
							width: rect.width,
							height: rect.height,
							viewportWidth: window.innerWidth,
							viewportHeight: window.innerHeight
						}
					}, '*');
				}
			}, true);
		})();`;
	}

	public closeWebsiteButtonPopover(): void {
		this.showWebsiteButtonPopover = false;
		this.isWebsiteButtonPopoverDragging = false;
	}

	public getWebsiteButtonPopoverStyles(): { [key: string]: string } {
		return {
			left: `${this.websiteButtonPopoverX}px`,
			top: `${this.websiteButtonPopoverY}px`,
		};
	}

	public startWebsiteButtonPopoverDrag(event: PointerEvent): void {
		if (!this.showWebsiteButtonPopover) {
			return;
		}

		this.isWebsiteButtonPopoverDragging = true;
		this.websiteButtonPopoverDragStartX = event.clientX;
		this.websiteButtonPopoverDragStartY = event.clientY;
		this.websiteButtonPopoverInitialX = this.websiteButtonPopoverX;
		this.websiteButtonPopoverInitialY = this.websiteButtonPopoverY;
		event.preventDefault();
	}

	@HostListener('window:pointermove', ['$event'])
	public onWebsiteButtonPopoverPointerMove(event: PointerEvent): void {
		if (!this.isWebsiteButtonPopoverDragging) {
			return;
		}

		const deltaX = event.clientX - this.websiteButtonPopoverDragStartX;
		const deltaY = event.clientY - this.websiteButtonPopoverDragStartY;
		const nextX = this.websiteButtonPopoverInitialX + deltaX;
		const nextY = this.websiteButtonPopoverInitialY + deltaY;
		const previewWidth = this.websitePreviewMediaRef?.nativeElement?.clientWidth || 0;
		const previewHeight = this.websitePreviewMediaRef?.nativeElement?.clientHeight || 0;
		const popoverWidth = this.websiteButtonPopoverRef?.nativeElement?.offsetWidth || 300;
		const popoverHeight = this.websiteButtonPopoverRef?.nativeElement?.offsetHeight || 250;
		const maxX = Math.max(8, previewWidth - popoverWidth - 8);
		const maxY = Math.max(8, previewHeight - popoverHeight - 8);

		this.websiteButtonPopoverX = Math.max(8, Math.min(nextX, maxX));
		this.websiteButtonPopoverY = Math.max(8, Math.min(nextY, maxY));
	}

	@HostListener('window:pointerup')
	@HostListener('window:pointercancel')
	public stopWebsiteButtonPopoverDrag(): void {
		this.isWebsiteButtonPopoverDragging = false;
	}

	private getWebsitePreviewEntryContent(websiteFiles: any[], path: string[], extension: '.html' | '.css' | '.js', fallbackContent: string): string {
		const fileNode = this.findWebsiteFileByPath(websiteFiles, path);

		if (!fileNode) {
			const extensionFallbackNode = this.findFirstWebsiteFileByExtension(websiteFiles, extension);
			return extensionFallbackNode?.content || fallbackContent || '';
		}

		return fileNode.content || '';
	}

	private findWebsiteFileByPath(websiteFiles: any[], path: string[]): any | undefined {
		if (!Array.isArray(websiteFiles) || websiteFiles.length === 0 || path.length === 0) {
			return undefined;
		}

		const normalizedRows = websiteFiles.map((item: any) => ({
			id: String(item.id),
			parentId: item.parentId !== undefined && item.parentId !== null ? String(item.parentId) : null,
			name: String(item.name || ''),
			nodeType: item.nodeType,
			content: item.content,
		}));

		const descendFromParent = (parentId: string | null, pathIndex: number): any | undefined => {
			let currentParentId = parentId;
			let currentNode: any;

			for (let index = pathIndex; index < path.length; index++) {
				const segment = path[index];
				const isFile = index === path.length - 1;

				currentNode = normalizedRows.find((row: any) => {
					if (row.parentId !== currentParentId) {
						return false;
					}

					if (row.name.toLowerCase() !== segment.toLowerCase()) {
						return false;
					}

					return isFile ? row.nodeType === 'file' : row.nodeType === 'folder';
				});

				if (!currentNode) {
					return undefined;
				}

				currentParentId = currentNode.id;
			}

			return currentNode;
		};

		const directMatch = descendFromParent(null, 0);

		if (directMatch) {
			return directMatch;
		}

		const rootFolderMatches = normalizedRows.filter((row: any) => row.parentId === null && row.nodeType === 'folder');

		for (const rootFolder of rootFolderMatches) {
			const wrappedMatch = descendFromParent(rootFolder.id, 0);

			if (wrappedMatch) {
				return wrappedMatch;
			}
		}

		return undefined;
	}

	private findFirstWebsiteFileByExtension(websiteFiles: any[], extension: '.html' | '.css' | '.js'): any | undefined {
		if (!Array.isArray(websiteFiles) || websiteFiles.length === 0) {
			return undefined;
		}

		return websiteFiles.find((item: any) =>
			item &&
			item.nodeType === 'file' &&
			typeof item.name === 'string' &&
			item.name.toLowerCase().endsWith(extension)
		);
	}

	private getPreviewBaseHref(): string {
		return document?.baseURI || window?.location?.origin || '/';
	}

	private normalizeWebsiteHtml(html: string): string {
		const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);

		if (bodyMatch && bodyMatch[1]) {
			return bodyMatch[1];
		}

		return html;
	}

	private extractWebsiteHead(html: string): string {
		const headMatch = html.match(/<head[^>]*>([\s\S]*)<\/head>/i);

		if (!headMatch || !headMatch[1]) {
			return '';
		}

		return headMatch[1]
			.replace(/<base[^>]*>/gi, '')
			.replace(/<meta[^>]*charset[^>]*>/gi, '')
			.replace(/<meta[^>]*name=["']viewport["'][^>]*>/gi, '');
	}

	private normalizeWebsiteCss(css: string): string {
		return css
			.replace(/<style[^>]*>/gi, '')
			.replace(/<\/style>/gi, '');
	}

	private normalizeWebsiteJs(js: string): string {
		return js
			.replace(/<script[^>]*>/gi, '')
			.replace(/<\/script>/gi, '');
	}

	private isWebsiteTemplate(template: Template): boolean {
		const creativeTypeName = template?.bannertype?.name;

		return typeof creativeTypeName === 'string' && creativeTypeName.toLowerCase().includes('website');
	}
	private updateContainer() {
	
			this.containerService.update(
				this.activeContainer.id,
				{
					'name': this.activeContainer.name,
					'description': this.activeContainer.description,
					'bannerId': this.activeContainer.bannerId,
					'displayorder': (this.activeContainer.displayorder === null) ? 1 : this.activeContainer.displayorder,
					'duration': (this.activeContainer.duration === null) ? 15 : this.activeContainer.duration
				}
			)
				.pipe(first())
				.subscribe({
					next: (updatedContainer) => {
						console.log('Updated Container:', updatedContainer);
						this.alertService.success('Container updated successfully.', { keepAfterRouteChange: true });
						this.containerUpdate = false;
	
						this.initialiseContainerComponentMetaData(updatedContainer, updatedContainer.banner);
	
						this.refreshBanner(this.activeContainer);
	
					},
					error: error => {
						this.alertService.error(error);
						this.containerUpdate = false;
					}
				});
	}
	private initialiseContainerComponentMetaData(container: any, banner: any) {

		this.resetUIVariables();

		container.components.forEach((component: any) => {

			const meta: any = {};
			component.componentmeta.forEach((element: any) => {
				meta[element.name] = element.value;
			});

			if (component.componenttype.name === 'Image') {

				async function readImageFilePath(path_image: string) {
					const response = await fetch(path_image);
					return await response.blob();
				}

				const ImgDataURI = readImageFilePath(component.componentmeta.find((y: any) => y.name === 'path').value);

				ImgDataURI.then((obj: any) => {

					console.log('ImgDataURI:', obj, ImgDataURI);

					meta['dataFile'] = obj;

					this.componentMetaFiles.push({
						smart: component.smart,
						deletedAt: component.deletedAt,
						name: component.name,
						containerId: component.containerId,
						componenttypeId: component.componenttype.id,
						componenttypeName: component.componenttype.name,
						bannerWidth: banner.bannersize.width,
						bannerHeight: banner.bannersize.height,
						id: component.id,
						componentmeta: meta,
						animations: component.animations
					});
				});

			} else {

				this.componentMetaFiles.push({
					smart: component.smart,
					deletedAt: component.deletedAt,
					name: component.name,
					containerId: component.containerId,
					componenttypeId: component.componenttype.id,
					componenttypeName: component.componenttype.name,
					bannerWidth: banner.bannersize.width,
					bannerHeight: banner.bannersize.height,
					id: component.id,
					componentmeta: meta,
					animations: component.animations
				});
			}

			if (component.animations.length > 0) {
				this.componentAnimations.push(component.animations);
			}

		});

		this.activeContainer = container;

		this.componentAnimations = this.componentAnimations.flat();

		console.log('componentAnimations:', this.componentAnimations);

		console.log('componentMetaFiles:', this.componentMetaFiles);
		console.log('activeContainer:', this.activeContainer);
	}
	private resetUIVariables(): void {

		this.activeContainer = null;

		this.componentMetaFiles = [];

		this.componentAnimations = [];
		this.componentAnimationsOutline = [];

		this.TimelineInitialised = false;
		this.TimelineOpen = false;
		this.animationEditUI = false;

		this.componentEditUI = false;
		this.previewActive = false;
		this.containerUpdate = false;

		this.animation_isPlaying = false;
		this.animation_isLooping = false;

		this.editingComponent = null;
		this.editingAnimation = null;

		//this.closeActiveAnimationEdit();
		//this.closeActiveComponentActionsMenu();
		//this.resetTimeline();

		//const emptyRow:TimelineRow[] = [];

		//this.timeline.setModel({rows:emptyRow});

	}
	private initialiseDataBasedOnContainer() {

		console.log('Container Value Set?', this.formControlActiveContainer.value);

		//this.activeBannerSizes = [];

		const banner = this.template.banners.find((y: any) => y.id == this.BannerId);
		console.log('Banner:', banner );

		this.activeBannerSizes.unshift(banner);

		console.log('activeBannerSize:', this.activeBannerSizes );

		banner.containers.forEach((container: any, index: number) => {

			if (index === 0 && this.formControlActiveContainer.value === '') {

				console.warn('Default Container:', container);

				this.formControlActiveContainer.patchValue(container.id);
				this.formControlActiveContainerOrder.patchValue(container.displayorder);
				this.formControlActiveContainerDuration.patchValue(container.duration);
				this.formControlActiveContainerClickThroughURL.patchValue(container?.clickThroughURL);
				this.formControlActiveContainerClickThroughName.patchValue(container?.clickThroughName);

				this.initialiseContainerComponentMetaData(container, banner);

			} else if (this.formControlActiveContainer.value === container.id) {

				console.warn('User Defined Container:', container);

				this.initialiseContainerComponentMetaData(container, banner);

			}

		});

	}
	private prepWebsiteData(data: any): void {
		//console.log('prepWebsite', data);
		this.Templates = data.templates;
		this.Clients = data.clients;
		this.BannerTypes = data.bannertypes;
		this.BannerSizes = data.bannersizes;
		this.Projects = data.projects;
		this.websiteTemplates = this.Templates
			.filter((template: Template) => template.status === true && template.deletedAt === null && this.isWebsiteTemplate(template))
			.map((template: Template) => this.mapTemplateToWebsiteTemplate(template));

		data.fonttypes.forEach((font: FontType) => {
			if (!document.getElementById("font-custom-stylesheet-id-" + font.id)) {
				const head = document.head;
				const link = document.createElement("link");

				link.type = "text/css";
				link.rel = "stylesheet";
				link.id = "font-custom-stylesheet-id-" + font.id;
				link.href = font.styleSheet;

				head.appendChild(link);
			}
		});

		this.uiDataReady = true;

		this.f['projectClient'].enable();

	}
	public playGlobalAnimation() {

		this.animation_isPlaying = this.animation_isPlaying === true ? false : true;
		this.playGlobalAnimationSubject.next(this.animation_isPlaying);

	}

	private getWebsiteTemplateById(id: any): websiteTemplate | undefined {
		return this.websiteTemplates.find((template) => template.id === String(id));
	}

	private parseWebsiteHtmlDocument(html: string): Document | null {
		try {
			return new DOMParser().parseFromString(html || '', 'text/html');
		} catch (error) {
			console.warn('Could not parse website html for button editing:', error);
			return null;
		}
	}

	private serializeWebsiteHtmlDocument(sourceHtml: string, doc: Document): string {
		const lowerSource = (sourceHtml || '').toLowerCase();

		if (lowerSource.includes('<html') || lowerSource.includes('<body')) {
			return doc.documentElement.outerHTML;
		}

		return doc.body.innerHTML;
	}

	private normalizeColorForInput(color: string, fallback: string): string {
		const trimmed = (color || '').trim().toLowerCase();

		if (!trimmed) {
			return fallback;
		}

		const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

		if (hexMatch) {
			if (hexMatch[1].length === 3) {
				return `#${hexMatch[1].split('').map((char) => `${char}${char}`).join('')}`;
			}

			return trimmed;
		}

		const rgbMatch = trimmed.match(/^rgba?\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[0-9.]+)?\)$/i);

		if (!rgbMatch) {
			return fallback;
		}

		const toHex = (value: string) => Math.max(0, Math.min(255, Number(value))).toString(16).padStart(2, '0');
		return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
	}

	private loadWebsiteButtonEditorValues(): void {
		if (!this.selectedTemplateData?.websiteHtml) {
			this.websiteButtonLabel = '';
			this.websiteButtonOffsetY = 0;
			this.websiteDivColor = '#ffffff';
			this.websiteDivWidth = '';
			this.websiteDivHeight = '';
			this.websiteDivBorder = '';
			this.websiteDivBorderRadius = '';
			this.websiteButtonEditorMessage = 'No website HTML found for element editing.';
			return;
		}

		const doc = this.parseWebsiteHtmlDocument(this.selectedTemplateData.websiteHtml);

		if (!doc) {
			this.websiteButtonEditorMessage = 'Could not read editable nodes from this template.';
			return;
		}

		const elements = Array.from(doc.querySelectorAll(this.selectedWebsiteElementSelector));

		if (elements.length === 0) {
			this.websiteButtonLabel = '';
			this.websiteButtonOffsetY = 0;
			this.websiteDivColor = '#ffffff';
			this.websiteDivWidth = '';
			this.websiteDivHeight = '';
			this.websiteDivBorder = '';
			this.websiteDivBorderRadius = '';
			this.websiteButtonEditorMessage = 'No editable element found in this HTML.';
			return;
		}

		const safeIndex = Math.max(0, Math.min(this.selectedWebsiteButtonIndex, elements.length - 1));
		const activeElement = elements[safeIndex] as HTMLElement;
		const topStyle = (activeElement.style.top || '').replace('px', '').trim();
		const textColorFallback = this.selectedWebsiteElementSelector === 'button' ? '#ffffff' : '#111111';
		const bgColorFallback = this.selectedWebsiteElementSelector === 'button' ? '#1f6f8b' : '#ffffff';
		const elementKey = `${this.selectedWebsiteElementSelector}:${safeIndex}`;
		const computedStyle = this.websiteElementComputedStyles[elementKey];
		const inlineWidth = (activeElement.style.width || '').trim();
		const inlineHeight = (activeElement.style.height || '').trim();
		const inlineBorder = (activeElement.style.border || '').trim();
		const inlineBorderRadius = (activeElement.style.borderRadius || '').trim();
		const inlineBackground = (activeElement.style.backgroundColor || '').trim();

		this.selectedWebsiteButtonIndex = safeIndex;
		this.websiteButtonLabel = (activeElement.textContent || '').trim();
		this.websiteButtonTextColor = this.normalizeColorForInput(activeElement.style.color, textColorFallback);
		this.websiteButtonBackgroundColor = this.normalizeColorForInput(activeElement.style.backgroundColor, bgColorFallback);
		this.websiteButtonOffsetY = Number.isNaN(Number(topStyle)) ? 0 : Number(topStyle);
		this.websiteDivColor = this.normalizeColorForInput(computedStyle?.backgroundColor || inlineBackground, '#ffffff');
		this.websiteDivWidth = (computedStyle?.width || inlineWidth || '').trim();
		this.websiteDivHeight = (computedStyle?.height || inlineHeight || '').trim();
		this.websiteDivBorder = (computedStyle?.border || inlineBorder || '').trim();
		this.websiteDivBorderRadius = (computedStyle?.borderRadius || inlineBorderRadius || '').trim();
		this.websiteButtonEditorMessage = '';
	}

	private refreshWebsiteButtonOptions(): void {
		if (!this.selectedTemplateData?.websiteHtml) {
			this.websiteButtonOptions = [];
			this.websiteButtonEditorMessage = 'No website HTML found for element editing.';
			return;
		}

		const doc = this.parseWebsiteHtmlDocument(this.selectedTemplateData.websiteHtml);

		if (!doc) {
			this.websiteButtonOptions = [];
			this.websiteButtonEditorMessage = 'Could not read editable nodes from this template.';
			return;
		}

		const buttonOptions = Array.from(doc.querySelectorAll('button')).map((button, index) => ({
			index,
			selector: 'button' as const,
			key: `button:${index}`,
			label: (button.textContent || '').trim() || `Button ${index + 1}`,
		}));

		const divOptions = Array.from(doc.querySelectorAll('div'))
			.map((div, index) => ({
				index,
				selector: 'div' as const,
				key: `div:${index}`,
				label: (div.textContent || '').trim(),
			}))
			.filter((row) => row.label.length > 0)
			.map((row, filteredIndex) => ({
				...row,
				label: row.label || `Div ${filteredIndex + 1}`,
			}));

		this.websiteButtonOptions = [...buttonOptions, ...divOptions];

		if (this.websiteButtonOptions.length === 0) {
			this.websiteButtonEditorMessage = 'No <button> or text <div> found in this HTML.';
			return;
		}

		const activeOption = this.websiteButtonOptions.find((option) =>
			option.selector === this.selectedWebsiteElementSelector && option.index === this.selectedWebsiteButtonIndex
		);

		if (!activeOption) {
			this.selectedWebsiteElementSelector = this.websiteButtonOptions[0].selector;
			this.selectedWebsiteButtonIndex = this.websiteButtonOptions[0].index;
		}

		this.loadWebsiteButtonEditorValues();
	}

	private applyWebsiteButtonChanges(): void {
		if (!this.selectedTemplateData?.websiteHtml) {
			return;
		}

		const doc = this.parseWebsiteHtmlDocument(this.selectedTemplateData.websiteHtml);

		if (!doc) {
			return;
		}

		const elements = Array.from(doc.querySelectorAll(this.selectedWebsiteElementSelector));
		const targetElement = elements[this.selectedWebsiteButtonIndex] as HTMLElement | undefined;

		if (!targetElement) {
			return;
		}

		if (this.selectedWebsiteElementSelector === 'button') {
			targetElement.textContent = this.websiteButtonLabel || targetElement.textContent || `${this.selectedWebsiteElementSelector} ${this.selectedWebsiteButtonIndex + 1}`;
			targetElement.style.color = this.websiteButtonTextColor;
			targetElement.style.backgroundColor = this.websiteButtonBackgroundColor;
			targetElement.style.position = 'relative';
			targetElement.style.top = `${this.websiteButtonOffsetY}px`;
		} else {
			targetElement.style.backgroundColor = this.websiteDivColor;

			if (this.websiteDivWidth.trim()) {
				targetElement.style.width = this.websiteDivWidth.trim();
			} else {
				targetElement.style.removeProperty('width');
			}

			if (this.websiteDivHeight.trim()) {
				targetElement.style.height = this.websiteDivHeight.trim();
			} else {
				targetElement.style.removeProperty('height');
			}

			if (this.websiteDivBorder.trim()) {
				targetElement.style.border = this.websiteDivBorder.trim();
			} else {
				targetElement.style.removeProperty('border');
			}

			if (this.websiteDivBorderRadius.trim()) {
				targetElement.style.borderRadius = this.websiteDivBorderRadius.trim();
			} else {
				targetElement.style.removeProperty('border-radius');
			}
		}

		this.selectedTemplateData.websiteHtml = this.serializeWebsiteHtmlDocument(this.selectedTemplateData.websiteHtml, doc);
		this.refreshWebsiteButtonOptions();
	}

	public onWebsiteButtonSelectionChange(value: string): void {
		const [selector, indexValue] = String(value).split(':');
		const selectedIndex = Number(indexValue);

		if ((selector !== 'button' && selector !== 'div') || Number.isNaN(selectedIndex)) {
			return;
		}

		this.selectedWebsiteElementSelector = selector;
		this.selectedWebsiteButtonIndex = selectedIndex;
		this.loadWebsiteButtonEditorValues();
	}

	public updateWebsiteButtonLabel(value: string): void {
		this.websiteButtonLabel = value;
		this.applyWebsiteButtonChanges();
	}

	public updateWebsiteButtonTextColor(value: string): void {
		this.websiteButtonTextColor = value;
		this.applyWebsiteButtonChanges();
	}

	public updateWebsiteButtonBackgroundColor(value: string): void {
		this.websiteButtonBackgroundColor = value;
		this.applyWebsiteButtonChanges();
	}

	public updateWebsiteButtonOffsetY(value: string): void {
		const offset = Number(value);

		if (Number.isNaN(offset)) {
			return;
		}

		this.websiteButtonOffsetY = offset;
		this.applyWebsiteButtonChanges();
	}

	public nudgeWebsiteButtonOffset(delta: number): void {
		this.websiteButtonOffsetY += delta;
		this.applyWebsiteButtonChanges();
	}

	public updateWebsiteDivColor(value: string): void {
		this.websiteDivColor = value;
		this.applyWebsiteButtonChanges();
	}

	public updateWebsiteDivWidth(value: string): void {
		this.websiteDivWidth = value;
		this.applyWebsiteButtonChanges();
	}

	public updateWebsiteDivHeight(value: string): void {
		this.websiteDivHeight = value;
		this.applyWebsiteButtonChanges();
	}

	public updateWebsiteDivBorder(value: string): void {
		this.websiteDivBorder = value;
		this.applyWebsiteButtonChanges();
	}

	public updateWebsiteDivBorderRadius(value: string): void {
		this.websiteDivBorderRadius = value;
		this.applyWebsiteButtonChanges();
	}

	@HostListener('window:message', ['$event'])
	public onPreviewSelectionMessage(event: MessageEvent): void {
		const data = event?.data;

		if (!data || data.type !== 'website-preview-element-selected') {
			return;
		}

		if (!this.selectedTemplateData) {
			return;
		}

		if (String(data.templateId || '') !== String(this.selectedTemplateData.id || '')) {
			return;
		}

		const selectedIndex = Number(data.elementIndex);
		const selectedType = data.elementType === 'div' ? 'div' : 'button';

		if (Number.isNaN(selectedIndex)) {
			return;
		}

		this.selectedWebsiteElementSelector = selectedType;
		this.selectedWebsiteButtonIndex = selectedIndex;

		if (selectedType === 'div' && data.computedStyle) {
			const computedStyle = data.computedStyle as WebsiteElementComputedStyle;
			this.websiteElementComputedStyles[`div:${selectedIndex}`] = computedStyle;
		}

		this.loadWebsiteButtonEditorValues();
		this.websiteButtonEditorMessage = '';

		const rect = data.buttonRect;
		if (rect) {
			const previewWidth = Number(rect.viewportWidth) || 0;
			const previewHeight = Number(rect.viewportHeight) || 0;
			const popoverWidth = 300;
			const popoverHeight = 250;
			const preferredX = Number(rect.left) + Number(rect.width) + 12;
			const preferredY = Number(rect.top);

			this.websiteButtonPopoverX = Math.max(8, Math.min(preferredX, Math.max(8, previewWidth - popoverWidth - 8)));
			this.websiteButtonPopoverY = Math.max(8, Math.min(preferredY, Math.max(8, previewHeight - popoverHeight - 8)));
		} else {
			this.websiteButtonPopoverX = 16;
			this.websiteButtonPopoverY = 16;
		}

		this.showWebsiteButtonPopover = true;
	}

	public updateWebsiteField(field: 'title' | 'subtitle' | 'content', value: string): void {
		if (!this.selectedTemplateData) {
			return;
		}

		this.selectedTemplateData[field].value = value;
	}

	public updateWebsiteImageUrl(value: string): void {
		if (!this.selectedTemplateData) {
			return;
		}

		this.selectedTemplateData.image = value;
		this.preview = value;
	}

	public selectFile(event: any): void {
		this.message = '';
		this.preview = '';
		this.progress = 0;
		this.selectedFiles = event.target.files;

		if (!this.selectedTemplateData) {
			return;
		}
	  
		if (this.selectedFiles) {
		  const file: File | null = this.selectedFiles.item(0);
	  
		  if (file) {
			this.preview = '';
			this.currentFile = file;
	  
			const reader = new FileReader();
	  
			reader.onload = (e: any) => {
			  this.preview = e.target.result;
			  this.selectedTemplateData.image = e.target.result;
			};
	  
			reader.readAsDataURL(this.currentFile);
		  }
		}
	  }
	public upload(): void {
		this.progress = 0;
	  
		if (this.selectedFiles) {
		  const file: File | null = this.selectedFiles.item(0);
	  
		  if (file) {
			this.currentFile = file;
	  
			this.uploadService.upload(this.currentFile).subscribe({
			  next: (event: any) => {
				if (event.type === HttpEventType.UploadProgress) {
				  this.progress = Math.round((100 * event.loaded) / event.total);
				} else if (event instanceof HttpResponse) {
				  this.message = event.body.message;
				  this.imageInfos = this.uploadService.getFiles();
				}
			  },
			  error: (err: any) => {
				console.log(err);
				this.progress = 0;
	  
				if (err.error && err.error.message) {
				  this.message = err.error.message;
				} else {
				  this.message = 'Could not upload the image!';
				}
	  
				this.currentFile = undefined;
			  },
			});
		  }
	  
		  this.selectedFiles = undefined;
		}
	  }
	public addComponentDialog(component: any) {
	
			const confirmDialog = this.dialog.open(DialogBannerComponentAddComponent, {
				data: {
					title: 'Add ' + component.name,
					message: '',
					component: component,
					template: this.template,
					containerId: this.activeContainer.id,
					activeBannerSize: this.activeBannerSizes[0],
				}
			});
			confirmDialog.afterClosed().subscribe(result => {
	
				console.log('newComponent from dialog:', result);
	
				if (result !== undefined && result !== false) {
	
					console.log('newComponent from dialog:', result);
					//this.alertService.success( component.name + ' added successfully.', { keepAfterRouteChange: false });
	
					this.addComponent(result);
	
				} else {
					this.alertService.info('Cancel Adding Component ' + component.name, { keepAfterRouteChange: false });
				}
			});
		}
	private prepPageData(data: any): void {

		this.formDataFonts = data.fonttypes;
		this.formDataClients = data.clients;
		this.formDataBannerTypes = data.bannertypes;
		this.formDataBannerSizes = data.bannersizes;
		this.formDataComponentType = data.componenttypes;

		data.fonttypes.forEach((font: FontType) => {
			if (!document.getElementById("font-custom-stylesheet-id-" + font.id)) {
				const head = document.head;
				const link = document.createElement("link");

				link.type = "text/css";
				link.rel = "stylesheet";
				link.id = "font-custom-stylesheet-id-" + font.id;
				link.href = font.styleSheet;

				head.appendChild(link);
			}
		});

	}
		/**
	 * Sends new components emitted through
	 * FDCEvent from add.edit.component.ts
	 * to banner.creator.component.ts newComponentObs
	 * is subscribed to banner.creator.directive.ts
	 *
	 */
		private addComponent(component: any) {

			//this.componentMetaFiles.push(component);
	
			this.componentMetaFiles.push(component);
	
			this.newComponentSubject.next({
				stage: 'bannerCanvas-' + this.activeBannerSizes[0].bannersize.width + '-' + this.activeBannerSizes[0].bannersize.height,
				stages: this.activeBannerSizes[0].containers.length,
				type: component.componenttype.name.toLowerCase(),
				data: component
			});
		}
	public onStepChange(event: any): void {
		//console.log('onStepChange:', event);

		//if( event.selectedIndex === 2 ) {
		//this.prepFinalVariationsArray();
		//}
	}
	public selectedTemplate(id: any){
		const selectedTemplate = this.getWebsiteTemplateById(id);

		if (!selectedTemplate) {
			return;
		}

		this.websiteSelectedTemplateID = selectedTemplate.id;
		this.preview = selectedTemplate.image;
		this.websiteSelectedTemplate = true;
		this.selectedTemplateData = selectedTemplate;
		this.showWebsiteButtonPopover = false;
		this.refreshWebsiteButtonOptions();
	}
	public previewTemplate(id: any){
		this.selectedTemplate(id);

		if (this.selectedTemplateData) {
			const dialogRef = this.dialog.open(PreviewDialog,
				{
					data: {name: this.selectedTemplateData, animal: this.websiteSelectedTemplateID},
				});

			dialogRef.afterClosed().subscribe(result => {
				console.log(`Dialog result: ${result}`);
			  });
		}
	}
	public selectComponentFromControlMenu(event: any): void {

		this.componentEditUI = true;

		const component = this.activeContainer.components.find((y: any) => y.id == event.id);

		console.log('selectComponentFromControlMenu:', event, component);

		this.editingComponentActionsMenu = component;
		this.editableComponentActionMenuSubject.next(component);

	}
	public editContainerDialog(container: any) {
	
			console.log('editContainerDialog:', container);
	
			this.containerUpdate = true;
	
			const editDialog = this.dialog.open(DialogBannerContainerEditComponent, {
				width: '700px',
				data: {
					title: 'Edit Container/Frame:' + container.name,
					message: '',
					container: container,
					template: this.template,
					containerId: this.activeContainer.id,
					activeBannerSize: this.activeBannerSizes[0]
				}
			});
			editDialog.afterClosed().subscribe(result => {
	
				console.log('newComponent from dialog:', result);
	
				if ([undefined, false, null, ''].includes(result)) {
	
					this.alertService.info('Action Cancelled.', { keepAfterRouteChange: false });
	
					this.containerUpdate = false;
	
				} else {
	
					console.log('passContainer from dialog:', result);
	
					this.formControlActiveContainerOrder.patchValue(result.displayorder);
					this.formControlActiveContainerDuration.patchValue(result.duration);
	
					this.formControlActiveContainerClickThroughName.patchValue(result.clickThroughName);
					this.formControlActiveContainerClickThroughURL.patchValue(result.clickThroughURL);
	
	
					this.activeBannerSizes[0].containers = this.activeBannerSizes[0].containers.filter((x: any) => x.id !== result.id);
					this.activeBannerSizes[0].containers.push(result);
	
					this.initialiseContainerComponentMetaData(result, result.banner);
	
					const patience = setTimeout(() => {
	
						this.containerUpdate = false;
	
						this.refreshBanner(this.activeContainer);
	
						clearTimeout(patience);
	
					}, 2000);
	
				}
			});
	
	}
		/**
		 * CONTROL PANEL DIALOG TRIGGERS
		 */
		public addContainerDialog(container: any) {
	
			console.log('addContainerDialog:', container);
	
			const confirmDialog = this.dialog.open(DialogBannerContainerAddComponent, {
				data: {
					title: 'Add New Container/Frame?',
					message: '',
					container: container,
					template: this.template,
					containerId: this.activeContainer.id,
					activeBannerSize: this.activeBannerSizes[0]
				}
			});
			confirmDialog.afterClosed().subscribe(result => {
	
				if (result !== undefined && result !== false) {
	
					console.log('passContainer from dialog:', result);
	
					//this.reinit();
					// add new container to list of banners in ui
					this.activeBannerSizes[0].containers.push(result);
	
				} else {
					this.alertService.info('Action Cancelled.', { keepAfterRouteChange: false });
				}
			});
		}
		public exportCreative(): void {

			//this.generateSubject.next(this.activeContainer);
		
			this.generateSubject.next(this.activeBannerSizes[0].containers);
		}
		
	public creativeReady($event: any): void {
		//console.log('creativeReady:', $event);

		this.activeBannerSizes.forEach((size: any) => {
			const container = size.containers.find((container: any) => container.id === $event.containerId);

			//console.log('creativeReady container:', container, size.containers);

			if (container) {

				if ($event.state === true) {
					//console.log('creativeReady:', $event, container);
					container.creativeReady = true;
					this.creativeReadySubject.next(true);
				} else {
					container.creativeReady = false;
					this.creativeReadySubject.next(false);
				}
			}
		});

	}
	public activeComponentsActionMenu(event: any): void {

		this.componentEditUI = true;
		console.log('activeComponentsActionMenu:', event);
		this.editingComponentActionsMenu = event;
		this.editableComponentActionMenuSubject.next(event);
	}
	public acceptComponentPositionUpdates(event: any) {
		console.log('acceptComponentPositionUpdates:', event);
	
		this.componentPositionUpdateEventfromPage.emit(event);
	}

	public refreshBanner(db?: any) {
		if (db !== undefined) {
			this.refreshStageSubject.next(db);
		} else {
			this.refreshStageSubject.next(true);
		}
	}

	/**
	 * EVENTS FOR HTML5 CANVAS CREATIVE
	 */
	public playAnimation(banner: any, container: any) {
		this.animation_isPlaying = this.animation_isPlaying === true ? false : true;

		container.animation_isPlaying = this.animation_isPlaying;

		this.playStageAnimationSubject.next({
			state: this.animation_isPlaying,
			banner: banner,
			container: container
		});
	}

	public frameAnimationStart($event: any) {
		this.animation_isPlaying = true;

		this.activeBannerSizes.forEach((size: any) => {
			const container = size.containers.find((container: any) => container.id === $event);
			if (container) {
				container.animation_isPlaying = true;
			}
		});
	}
	public drop(event: CdkDragDrop<websiteTemplate[]>) {
		console.log(event);
		console.log(this.websiteTemplates);
		console.log(event.previousIndex);
		console.log(event.currentIndex);
		moveItemInArray(this.websiteTemplates, event.previousIndex, event.currentIndex);
	  }
	public frameAnimationEnd($event: any) {
		this.animation_isPlaying = false;

		this.activeBannerSizes.forEach((size: any) => {
			const container = size.containers.find((container: any) => container.id === $event);
			if (container) {
				container.animation_isPlaying = false;
			}
		});
	}
		public dropComponentOrder(event: CdkDragDrop<any[]>): void {
			console.log('dropComponentOrder:', event);
	
			if (event.previousContainer === event.container) {
				moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
			} else {
				transferArrayItem(
					event.previousContainer.data,
					event.container.data,
					event.previousIndex,
					event.currentIndex,
				);
			}
		}

	public GlobalAnimationEnd($event: any) {
		this.animation_isPlaying = false;
		this.playGlobalAnimationSubject.next(null);
	}

	public previewCreative(db?: any) {
		if (db !== undefined) {
			this.refreshStageSubject.next(db);
		} else {
			this.refreshStageSubject.next(true);
		}
	}

	private resetUIControls() {
		this.creativeType = undefined;
		this.noOfVariations = 0;
		this.completedBannerVariationCounter = 0;
		this.TotalContainersForAllCreatives = 0;
		this.variationsGenerated = false;
		this.variationsExported = false;
		this.exportingProcess = false;
		this.animation_isPlaying = false;
		//this.variationsTracker = [];
		this.variationsTracker.splice(0, this.variationsTracker.length);
	}

	private resetSelectedCreativeData() {
		console.warn("____________[ resetSelectedCreativeData ]________________[14]",);
		console.log("BannerSizes : ",this.BannerSizes)
		console.log("TemplateRules : ",this.TemplateRules)
		console.log("activeBannerSizes : ",this.activeBannerSizes)
		console.log("updateableComponents : ",this.updateableComponents)
		this.activeTemplate = null;
		//this.BannerSizes = [];
		//this.TemplateRules = [];
		//this.activeBannerSizes = [];
		//this.updateableComponents = [];

		this.BannerSizes.splice(0, this.BannerSizes.length);
		this.TemplateRules.splice(0, this.TemplateRules.length);
		this.activeBannerSizes.splice(0, this.activeBannerSizes.length);
		this.updateableComponents.splice(0, this.updateableComponents.length);
	}

	private resetvariationsData() {
		console.log("WebsitePage ________________________________________________________________[15]",);
		this.FormGroupVariations.patchValue(false);
		this.variationCollectionForExport.splice(0, this.variationCollectionForExport.length);
		this.intialisePagination();
	}

	/**
	 * User Selected Bannersizes
	 *
	 * @param id (Number)
	 *
	 */
	public selectedBannerSize(id: number | string) {
		console.log("WebsitePage ________________________________________________________________[16]",);
		const updatableComponents: any[] = [];

		if (this.FormGroupProjectDetails.value.projectBannerSizes === false) {
			// remove from array
			this.activeBannerSizes = this.activeBannerSizes.filter(x => x.bannersizeId !== id);
			this.updateableComponents = this.updateableComponents.filter(x => x.bannersizeId !== id);
			this.TemplateRules = this.TemplateRules.filter(x => x.bannersizeId !== id);

		} else {

			if ([null, undefined].includes(this.activeTemplate)) { } else {
				//this.activeBannerSizes.push(this.BannerSizes.find(x => x.id === id));
				this.activeBannerSizes.push(
					this.activeTemplate.banners.find((x: any) => {
						if (x.bannersizeId === id) {

							x.readyForVariations = false;
							x.variationpercentage = 0;
							x.componentWindowOpen = false;

							// go through all components related to banner size
							x.containers.map((y: any) => {

								y.readyForVariations = false;
								y.componentWindowOpen = false;
								y.animation_isPlaying = false;
								y.creativeReady = false;

								y.components.map((z: any) => {
									z.bannerId = x.id;
									z.bannersizeId = id;
									z.containerDisplayOrder = y.displayorder;
									z.containerDuration = y.duration;
									// for establishing template rules
									if (z.smart === true) {
										z.readyForVariations = false;
										updatableComponents.push(z);
									}
								});
							});

							return x;
						}
					})
				);

				this.TemplateRules.push({
					'bannersizeId': id,
					'templaterules': this.generateTemplateRules(updatableComponents)
				});

				this.updateableComponents.push(updatableComponents);
			}
		}

		this.countNoofCounters();

		this.updateableComponents = this.updateableComponents.flat();

		//this.activeBannerSizes.readyforvariations = false;
		//console.warn('updatableComponents:', updatableComponents );
		console.warn('activeBannerSizes:', this.activeBannerSizes);
		console.warn('TemplateRules:', this.TemplateRules);
		console.warn('updatableComponents:', this.updateableComponents);
	}

	private generateTemplateRules(dynamicComponents: any): any[] {
		console.log("WebsitePage ________________________________________________________________[17]",);
		const TemplateRules: any[] = [];

		dynamicComponents.forEach((component: any) => {

			if (component.componenttype.name === 'Text' || component.componenttype.name === 'Button') {
				const textLength: number = (component.componentmeta.find((x: any) => x.name === 'fontValue').value).length;

				TemplateRules.push({
					'componentId': component.id,
					'bannerId': component.bannerId,
					'containerId': component.containerId,
					'name': component.name,
					'type': component.componenttype.name,
					'rules': [
						{
							'maximumcharacters': textLength
						}
					]
				});

			} else if (component.componenttype.name === 'Image') {

				//console.log('template rules: image', component.componentmeta);

				TemplateRules.push({
					'componentId': component.id,
					'bannerId': component.bannerId,
					'containerId': component.containerId,
					'name': component.name,
					'type': component.componenttype.name,
					'rules': [
						{
							'width': component.componentmeta.find((x: any) => x.name === 'width').value,
							'height': component.componentmeta.find((x: any) => x.name === 'height').value
						}
					]
				});
			}
		});

		return TemplateRules;
	}

	private countNoofCounters() {
		console.log("[18]",);

		let count = 0;

		this.activeBannerSizes.forEach((x: any) => {
			count += x.containers.length;
		});

		this.TotalContainersForAllCreatives = count;
		console.log("TotalContainersForAllCreatives", this.TotalContainersForAllCreatives);
		//return count;
	}
	public onTextChange(datain: any) {
		console.warn('onTextChange  look i am working', datain);

	}
	/**
	 * Events for when user drags and drops files
	 *
	 * @param newItem (Object)
	 *
	 */
	public DragAndDropEventItem(newItem: any) {
		console.warn("[Step 8] -->");
		console.warn(newItem, this.updateableComponents);

		if (!newItem.value) {
			if (!newItem || !newItem.data[0]) return;

			console.log("out here ")
			console.warn('DragAndDropEventItem 2:');
			this.files.push(newItem);

			console.warn('DragAndDropEventItem 3:', this.files);
			this.uploadedFileSubject.next(newItem);

			console.warn('DragAndDropEventItem 4:', this.uploadedFileSubject);

			// replacing the below
			// const checkRelevantUpdateableComponents = this.updateableComponents.filter((x:any) => x.containerId === newItem.containerId);
			this.activeBannerSizes.find((x: any) => {
				console.warn('DragAndDropEventItem 5:', x);
				console.warn("(" + 'bannerCanvas-' + x.bannersize.width + '-' + x.bannersize.height + ")" + "===" + newItem.stage);
				if (('bannerCanvas-' + x.bannersize.width + '-' + x.bannersize.height) === newItem.stage) {

					x.containers.find((y: any) => {

						console.warn("(" + y.id + "===" + newItem.containerId);
						if (y.id === newItem.containerId) {

							let containerReady = true;

							//checkRelevantUpdateableComponents.forEach((z:any) => {
							console.warn("check in updateableComponents");
							this.updateableComponents.filter((x: any) => x.containerId === newItem.containerId).forEach((z: any) => {
								if (newItem.type === z.componenttype.name || (newItem.type === 'Text' && z.componenttype.name === 'Button')) {
									console.warn("z.readyForVariations is this true");
									z.readyForVariations = true;
								}
								if (z.readyForVariations === false) {
									console.warn("containerReady is this true");
									containerReady = false;
								}
								console.warn("updateableComponents is this true", containerReady);
							});

							if (containerReady === true) {
								console.warn("containerReady is this true", containerReady);
								y.componentWindowOpen = false;
							}

							console.warn('checkRelevantUpdateableComponents:', this.updateableComponents);
						}

					});

					//this.isBannerReadyyForVariations(x.id);
				}
			});
		} else {
			console.warn("[Step 9] -->");
			console.log("out here ")
			console.warn('DragAndDropEventItem 2:');

			if (!newItem || !newItem.value) return;
			this.files.push(newItem);

			console.warn('DragAndDropEventItem 3:', this.files);

			console.warn("[Step 10] --> jump to to banner.component");
			this.uploadedFileSubject.next(newItem);

			console.warn('DragAndDropEventItem 4:', this.uploadedFileSubject);

			// replacing the below
			// const checkRelevantUpdateableComponents = this.updateableComponents.filter((x:any) => x.containerId === newItem.containerId);
			this.activeBannerSizes.find((x: any) => {
				console.warn('[step 12] --> find :', x);
				console.warn("(" + 'bannerCanvas-' + x.bannersize.width + '-' + x.bannersize.height + ")" + "===" + newItem.stage);
				if (('bannerCanvas-' + x.bannersize.width + '-' + x.bannersize.height) === newItem.stage) {
					console.warn("[step 13] --> Test", x);
					if (newItem.bannerType === 'GIFs') {
						console.warn("[step 14] --> Confirm that is ");
						console.log(x.bannertype.name);
						x.containers.find((y: any) => {
							console.warn("[step 15] --> In a container : ");
							console.log(x.containers);
							console.warn("[step 16] --> Test ", y.name + " === " + newItem.frame);
							if (y.name === newItem.frame) {
								console.warn("[step 17] --> Test Successful");
								let containerReady = true;

								//checkRelevantUpdateableComponents.forEach((z:any) => {
								console.warn("check in updateableComponents");

								this.updateableComponents.filter((x: any) => x.containerId === newItem.containerId).forEach((z: any) => {
									if (newItem.type === z.componenttype.name || (newItem.type === 'Text' && z.componenttype.name === 'Button')) {
										console.warn("z.readyForVariations is this true");
										z.readyForVariations = true;
									}
									if (z.readyForVariations === false) {
										console.warn("containerReady is this true");
										containerReady = false;
									}
									console.warn("updateableComponents is this true", containerReady);
								});

								if (containerReady === true) {
									console.warn("containerReady is this true", containerReady);
									//y.componentWindowOpen = false;
								}

								console.warn('checkRelevantUpdateableComponents:', this.updateableComponents);
							}

						});
					} else {
						x.containers.find((y: any) => {

							console.warn("(" + y.id + "===" + newItem.containerId);
							console.warn("[step 14] --> Test", x.containers);
							if (y.id === newItem.containerId) {

								let containerReady = true;

								//checkRelevantUpdateableComponents.forEach((z:any) => {
								console.warn("check in updateableComponents");
								this.updateableComponents.filter((x: any) => x.containerId === newItem.containerId).forEach((z: any) => {
									if (newItem.type === z.componenttype.name || (newItem.type === 'Text' && z.componenttype.name === 'Button')) {
										console.warn("z.readyForVariations is this true");
										z.readyForVariations = true;
									}
									if (z.readyForVariations === false) {
										console.warn("containerReady is this true");
										containerReady = false;
									}
									console.warn("updateableComponents is this true", containerReady);
								});

								if (containerReady === true) {
									console.warn("containerReady is this true", containerReady);
									//y.componentWindowOpen = false;
								}

								console.warn('checkRelevantUpdateableComponents:', this.updateableComponents);
							}

						});
					}


					this.isBannerReadyyForVariations(x.id);
				}
			});
		}

	}
	public creativeRules(): void {
		console.log('componentMetaFiles', this.activeContainer.components);
	
		const tempRules = this.bannerService.generateBannerComponentRules(this.activeContainer.components);
	
		console.log('creativeRules:', tempRules );
	
		this._bottomSheet.open(
			BottomSheetTemplateRulesComponent,
			{
				data: tempRules
			}
		);
	
		//this.alertService.info( 'WIP - Preview the current Creative Size Rules.', { keepAfterRouteChange: false });
	}
	public ResetVariationsEvent(data: any) {
		console.log("[21]",);
		//console.log('ResetVariationsEvent 1:', data);

		this.activeBannerSizes.find((x: any) => {
			if (('bannerCanvas-' + x.bannersize.width + '-' + x.bannersize.height) === ('bannerCanvas-' + data.banner.bannersize.width + '-' + data.banner.bannersize.height)) {

				//console.log('ResetVariationsEvent 2:', data);

				x.containers.find((y: any) => {

					if (y.id === data.containerId) {

						x.readyForVariations = false;
						x.variationpercentage = 0;

						y.readyForVariations = false;

						const stagee = 'bannerCanvas-' + data.banner.bannersize.width + '-' + data.banner.bannersize.height;

						this.resetVariationsSubject.next({
							stage: stagee,
							banner: data.banner,
							containerId: data.containerId
						});

						this.alertService.success('Creative assets for ' + data.banner.bannersize.width + 'x' + data.banner.bannersize.height + ' (Frame: ' + data.containerId + ') removed successfully.', { keepAfterRouteChange: true });
					}
				});

			}
		});
	}

	public RemoveUploadEventItem(removeItem: any) {

		//console.log('RemoveUploadEventItem:', removeItem);
		////console.log('this.files:', this.files);

		this.activeBannerSizes.find((x: any) => {

			if (('bannerCanvas-' + x.bannersize.width + '-' + x.bannersize.height) === removeItem.stage) {

				x.containers.find((y: any) => {

					if (y.id === removeItem.containerId) {

						switch (removeItem.type) {

							case 'Image':

								let imageCounter = 0;
								this.files.filter((xx: any) => (xx.type === 'Image' && xx.stage === 'bannerCanvas-' + x.bannersize.width + '-' + x.bannersize.height)).map((y) => {
									if (y.data.length > 0) {
										imageCounter++;
									}
								});

								////console.log('imageCounter:', imageCounter);

								if (imageCounter === 0) {
									x.variationsImageReadyCounter = 0;
									x.variationsImageReady = false;
									//this.noOfVariationsForGeneration = this.noOfVariationsForGeneration - 0.5;
								} else {
									x.variationsImageReadyCounter--;
								}

								break;

							case 'Text':
							case 'Copy':
							case 'Button':

								x.variationsCopyReady = false;
								//this.noOfVariationsForGeneration = this.noOfVariationsForGeneration - 0.5;

								break;
						}

						this.removeUploadItemSubject.next(removeItem);

						this.alertService.success('Uploaded "' + removeItem.componentName + '" asset (Frame: ' + removeItem.containerId + ') for Creative removed successfully.', { keepAfterRouteChange: true });

					}
				});

			}
		});
	}

	/**
	 * Send Variation Event to the Banner Directive for creating variations
	 *
	 * @param bannerComponent (Object)
	 *
	 */
	public generateVariations(bannerComponent: any) {
		console.warn('[Step 22 ] --> generateVariations');
		console.log(bannerComponent);

		bannerComponent.componentWindowOpen = false;

		bannerComponent.containers.map((x: any) => {
			x.componentWindowOpen = false;
		});

		this.noOfVariations++;
		bannerComponent.readyForVariations = true;
		console.warn('[Step 23 ] --> Moving to Banner.component with :', this.files);
		console.log(bannerComponent, this.files);

		this.variationsEvent.emit({ bannerComponent, dta: this.files });

		//this.FormGroupVariations.value.variationsReady = true;
		

	}
	

	public generateAllVariations() {
		console.log('[Step 20 ] --> generateAllVariations');

		for (let index = 0; index < this.updateableComponents.length; index++) {
			const element = this.updateableComponents[index];

			if (element.readyForVariations === false) {

				const faultyBanners = this.activeBannerSizes.find((x: any) => (x.id === element.bannerId));

				console.error('faultyBanners:', faultyBanners, element);

				this.alertService.error('Please upload all the assets for the ' + faultyBanners.name + ' creative before attempting to generate all variations.', { keepAfterRouteChange: true });

				this.variationsGenerated = false;

				return;

				break;
			}
			console.log('[Step 21 ] --> Test was successfully');
		}

		this.activeBannerSizes.forEach((x: any) => {
			x.readyForVariations = true;
			this.generateVariations(x);
		});

		this.variationsGenerated = true;

	}

	/**
	 * Used to determine if the container/frame for the Creative size is
	 * ready for variations.
	 *
	 * Updates this.variationsTracker object accordingly.
	 *
	 * @param bannerId (String)
	 *
	 */
	private isBannerReadyyForVariations(bannerId: string): void {
		console.warn("[Step 18] --> isBannerReadyyForVariations",);
		console.log(bannerId);

		let status = true;
		console.warn("[Step 19] --> updateableComponents",);
		console.log(this.updateableComponents);
		const chhh = this.updateableComponents.filter((x: any) => x.bannerId === bannerId);

		console.log('isBannerReadyyForVariations', chhh);

		console.log("element : " + chhh.length)

		for (let index = 0; index < chhh.length; index++) {
			const element = chhh[index];

			console.log("element : ", element)

			console.log(element.readyForVariations + " === " + false)
			if (element.readyForVariations === false) {

				status = false;

				break;
			}
		}
		console.log("status ", status)
		if (status === true) {
			this.activeBannerSizes.find((x: any) => {
				if (x.id === bannerId) {
					x.readyForVariations = true;
					//x.componentWindowOpen = false;

					this.variationsTracker.push({
						bannerId: x.id,
						counter: 0,
						noOfContainers: x.containers.length,
						frames: []
					});

				}
			});
		}

		console.warn('isBannerReadyyForVariations   test: ', this.variationsTracker, this.updateableComponents);

	}

	public acceptCollectionOfVariationsFromBannerComponent(bannerComponentVariationCollection: any) {
		console.log("[26]",);
		//console.log("acceptCollectionOfVariationsFromBannerComponent	", bannerComponentVariationCollection)

		//console.log('CreativeType:', this.f['projectBannerType'].value);
		//console.log('acceptCollectionOfVariationsFromBannerComponent:', bannerComponentVariationCollection);

		//console.log('CreativeType:', this.creativeType + ":");
		//const creativeType = this.BannerTypes.find((x:any) => x.id === this.f['projectBannerType'].value)?.name;

		if (this.creativeType === 'GIFs' || this.creativeType === 'HTML5') {
			//console.log('if static GIFs is available');
			this.variationsTracker.find((x: any) => {
				if (x.bannerId === bannerComponentVariationCollection.bannerId) {

					x.counter = x.counter + 1;

					bannerComponentVariationCollection.data.forEach((y: any) => {

						/** /
						if( y.stageUpdateComponents === undefined || y.stageUpdateComponents.length === 0 ) {} else {
							for (let index = 0; index < y.stageUpdateComponents.length; index++) {
								const element = y.stageUpdateComponents[index];
								y.stageComponents[element.componentIndex].componentmeta[element.componentMetaIndex].value = element.value;

								//console.log('y updated:', y);
							}
						}
						/**/

						x.frames.push(
							y
						);
					});

					if (x.counter == x.noOfContainers) {

						this.generateAllFrames(x.frames)
							.then((FinalGIFVariations: any[]) => {

								this.variationCollectionForExport.push(FinalGIFVariations);

								if (this.TotalContainersForAllCreatives === this.completedBannerVariationCounter) {
									this.prepFinalVariationsArray();
									this.intialisePagination();

									this.variationsExported = true;
									this.FormGroupVariations.patchValue(true);
									this.exportingProcess = false;
								}

							});

					}
				}
			});

		} else if (this.creativeType === 'static') {

			//console.log('if static JPG is available');
			bannerComponentVariationCollection.data.forEach((x: any) => {
				this.variationCollectionForExport.push(x);
			});

			this.prepFinalVariationsArray();

			this.variationsExported = true;
			this.FormGroupVariations.patchValue(true);
			this.exportingProcess = false;

			this.intialisePagination();

		}

	}

	private prepFinalVariationsArray() {
		console.log("[27]",);
		this.variationCollectionForExport = this.variationCollectionForExport.flat();
		console.warn('variationCollectionForExport:', this.variationCollectionForExport);
	}

	private generateAllFrames(allFrames: any[]): Promise<any> {
		console.log("[28]",);
		return new Promise<any>((resolve, reject) => {

			const groupedArray = groupBy(allFrames, 'containerId');
			const containerIdKeys = Object.keys(groupedArray);

			////console.log('All GIF Frames:', x.frames);
			////console.log('GIF groupedArray:', groupedArray);

			//groupedArray = groupedArray.reverse();

			const varss: any = {};
			containerIdKeys.forEach(key => {
				varss[key] = groupedArray[key].map((zz: any) => zz.uid);
			});

			////console.log('varss:', varss);

			const allFramesCartesianProduct: any = getCartesianProduct(varss);

			let GCPCounter = 0;

			// initialise Arrays
			const FinalGIFVariations: any[] = [...Array(allFramesCartesianProduct.length)].map((jj: any[]) => []);
			FinalGIFVariations.map((j: any[]) => j = [...Array(containerIdKeys.length)].map(jj => []));

			////console.log('allFramesCartesianProduct:', allFramesCartesianProduct);
			////console.log('FinalGIFVariations:', FinalGIFVariations);

			allFramesCartesianProduct.forEach((framescombination: any) => {

				for (const key in framescombination) {
					if (Object.prototype.hasOwnProperty.call(framescombination, key)) {
						const element = framescombination[key];
						if (groupedArray[key]) {
							const uid_frame = groupedArray[key].find((ogAllFrames: any) => ogAllFrames.uid === element);
							FinalGIFVariations[GCPCounter].push(uid_frame);
						}
					}
				}

				GCPCounter++;

			});

			// sort containers by user defined order
			FinalGIFVariations.forEach((x: any[]) => {
				x.forEach((y: any) => {
					//const cont = y.bannerComponent.containers.find((z:any) => z.id === y.containerId);
					////console.log('displayOrder:', cont);
					y.displayorder = y.bannerComponent.containers.find((z: any) => z.id === y.containerId).displayorder;
				});

				x.sort((a, b) => (a.displayorder > b.displayorder) ? 1 : -1);
			});

			//console.warn('FinalGIFVariations:', FinalGIFVariations);

			resolve(FinalGIFVariations);

		});

	}

	private generateGIFs(variation: any[]): Promise<Blob> {
		console.log("[29]",);
		return new Promise<Blob>((resolve, reject) => {

			// https://stackoverflow.com/questions/21913673/execute-web-worker-from-different-origin
			urlContentToDataUri(`${environment.apiUrl}/gif.worker.js`)
				.then(
					(WorkerScriptResult) => {

						const gif = new GIF({
							workerScript: WorkerScriptResult,
							workers: 5,
							quality: 10
							//background: '#000'
						});

						variation.forEach((variationImgFrame: any) => {

							////console.log('generateGIFs variation:', variationImgFrame);

							gif.addFrame(variationImgFrame, { delay: 3000 });

						});

						gif.on('finished', (blob: Blob) => {

							//console.log('GIF Ready:', blob, gif);

							//const dataURL = URL.createObjectURL(blob);

							resolve(blob);

						});

						gif.render();
					}
				);

		});
	}

	private generateImageFromDataURI(imgDataURL: string): Promise<HTMLImageElement> {
		console.log("[30]",);
		return new Promise(
			(resolve, reject) => {

				const img = new Image();

				img.addEventListener("load", () => {
					////console.log('Frame Image Loaded');

					resolve(img);

				});
				img.src = imgDataURL;

			}
		);

	}

	/**
	 * Used to generate all the final GIFs
	 *
	 * @param FinalGIFVariation (Array)
	 *
	 */
	private GIFImagesFromDataURI(FinalGIFVariation: any[]): Promise<HTMLImageElement[]> {
		console.log("[31]",);
		const allFrameImages: any[] = [];

		for (let index = 0; index < FinalGIFVariation.length; index++) {
			const element = FinalGIFVariation[index];
			allFrameImages.push(this.generateImageFromDataURI(element.image))
		}

		return Promise.all(allFrameImages);

	}

	/**
	 * Send Variation Event to the Banner Directive for downloading variations
	 *
	 * @param bannerComponent (Object)
	 *
	 */
	public exportVariation(bannerComponent: any) {
		console.log("[32]",);
		//console.log('exportVariation', bannerComponent);

		this.downloadVariationsEvent.emit(bannerComponent);

	}

	public progressPercentage(data: any) {
		console.log("[33]",);
		this.activeBannerSizes.find((x) => {
			if (x.bannersize.id === data.bannersizeId) {
				x.variationpercentage = data.value;
				if (data.value === 100) {

					////console.log('progressPercentage:', data );
					////console.log('progressPercentage:', data, this.f['projectBannerType'].value);
					this.completedBannerVariationCounter++;

					//if ( this.TotalContainersForAllCreatives === this.completedBannerVariationCounter ) {
					//	this.prepFinalVariationsArray();
					//}

					////console.log('completedBannerVariationCounter:', this.completedBannerVariationCounter );
				}
			}
		});

		//this.percentage = data

	}

	public exportAllVariations() {
		//console.log('exportAllVariations');
		this.exportingProcess = true;

		this.accordion.closeAll()

		this.activeBannerSizes.forEach((x: any) => {
			this.exportVariation(x);
		});

		this.variationsExported = true;
		//this.FormGroupVariations.patchValue(true);

	}

	public downloadAllVariations() {
		console.log("[34]",);
		this.generatingDownloads = true;

		const pauseBeforeBatch = setTimeout(() => {

			clearTimeout(pauseBeforeBatch);
			console.log(this.creativeType + '=== Static JPG');

			if (this.creativeType === 'static') {

				const zip = new JSZip();

				this.activeBannerSizes.forEach((x: any) => {
					////console.log(x.bannersize.width + 'x' + x.bannersize.height);

					const bannerName = x.bannersize.width + 'x' + x.bannersize.height;

					const img1 = zip.folder(bannerName);

					const BannersIWant = this.variationCollectionForExport.filter((varCollection: any) => {
						if (bannerName === (varCollection.bannerComponent.bannersize.width + 'x' + varCollection.bannerComponent.bannersize.height)) {
							return varCollection;
						}
					}
					);

					BannersIWant.forEach((blobs: any) => {
						img1?.file(blobs.name + '.jpg', blobs.blobFile);
					});
				});

				zip.generateAsync({ type: "blob" })
					.then((blobs) => {
						this.generatingDownloads = false;
						saveAs(blobs, 'variations.zip')
					});

			} else if (this.creativeType === 'GIFs') {

				const allVariationsGIFImages: any[] = [];

				this.variationCollectionForExport.forEach((GIFIMages: any[]) => {

					allVariationsGIFImages.push(this.GIFImagesFromDataURI(GIFIMages));
				});

				Promise.all(allVariationsGIFImages).
					then((allVariationsGIFImage: any[]) => {

						////console.log('allVariationsGIFImages', allVariationsGIFImage);

						return urlContentToDataUri(`${environment.apiUrl}/gif.worker.js`)
							.then(
								(WorkerScriptResult: any) => {

									return new Promise<Blob[]>((resolve, reject) => {

										let blobCounter = 0;
										const allBlobs: any[] = [];

										const gif = new GIF({
											workerScript: WorkerScriptResult,
											workers: 5,
											quality: 10,
											debug: false
											//background: '#000'
										});

										gif.on('finished', (blob: Blob) => {

											//window.open(URL.createObjectURL(blob));

											allBlobs.push(blob);

											//console.warn('GIF Ready element['+ index + ']:');
											////console.log('GIF Ready blob:', blob);
											////console.log('GIF Ready gif:', gif);

											gif.abort();
											// empty frames
											gif.frames.splice(0, gif.frames.length);

											blobCounter++;

											if (blobCounter === allVariationsGIFImage.length) {

												//console.warn('allBlobs:', allBlobs, blobCounter);

												//this.generatingDownloads = false;

												resolve(allBlobs);

											} else {

												//console.log('Next GIF:', blobCounter);

												aadFrmw();

											}

											////console.log('GIF Ready abort:', gif);

											//gif = undefined;
											//const dataURL = URL.createObjectURL(blob);
											//return blob;

										});

										function aadFrmw() {
											const element = allVariationsGIFImage[blobCounter];

											element.forEach((variationImgFrame: any) => {

												////console.log('generateGIFs variation:', variationImgFrame);
												gif.addFrame(variationImgFrame, { delay: 3000 });

											});

											gif.render();
										}

										aadFrmw();

									});

								}
							);

					})
					.then((gifs: Blob[]) => {

						//console.log('All GIFS:', gifs);

						const zip = new JSZip();

						/**/
						for (let index = 0; index < gifs.length; index++) {
							const element = gifs[index];
							zip.file(generateUUID() + '.gif', element);
						}

						zip.generateAsync({ type: "blob" })
							.then((blobs) => {
								this.generatingDownloads = false;
								saveAs(blobs, 'GIF-VARIATIONS.zip')
							});
						/**/
					});

			} else if (this.creativeType === 'HTML5') {

				const allVariationsHTML5: any[] = [];

				//let count = 0;

				this.variationCollectionForExport.forEach((x: any, counter: number) => {

					const stages: any[] = [];
					const banner = x[0].bannerComponent;
					for (let index = 0; index < x.length; index++) {
						const element = x[index];
						stages.push(
							{
								counter: counter,
								components: element.stageComponents,
								componentsUpdate: element.stageUpdateComponents
							}
						)
					}


					allVariationsHTML5.push(
						this.bannerCreatorService.batchHTML5ForExportGetPrepData(banner, stages)
					);

				});

				Promise.all(allVariationsHTML5)
					.then((allVariationsHTML5: any[]) => {

						this.alertService.info('All HTML5 Data Prepped. Please be Patient.', { keepAfterRouteChange: true });

						////console.log('All HTML5 Prep Data:', allVariationsHTML5);

						const allZipBlobs: any[] = [];

						allVariationsHTML5.forEach((variationFiles: any, index: number) => {

							allZipBlobs.push(this.bannerCreatorService.generateBatchZIPpackage(variationFiles));

						});

						Promise.all(allZipBlobs)
							.then((allZipBlob: any[]) => {
								////console.log('All HTML5 Variation ZIPS:', allZipBlob);

								const groupResultsByBannerSize = groupBy(allZipBlob, 'name');

								////console.log('All HTML5 Variation ZIPS:', groupResultsByBannerSize);

								this.alertService.info('All HTML5 Creatives Ready. Creating your final file. Please be patient.', { keepAfterRouteChange: true });

								/**/
								const zip = new JSZip();

								const constBannersizes = Object.keys(groupResultsByBannerSize);

								constBannersizes.forEach((bannersize: string) => {
									const element = groupResultsByBannerSize[bannersize];

									const bannersizeFolderName = zip.folder(bannersize);
									//bannersizeFolderName.file(countVar+'.zip', element.blobFile);

									let countVar = 0;

									element.forEach((variationBlob: any) => {
										bannersizeFolderName?.file(`${bannersize}-${countVar}.zip`, variationBlob.blob);
										countVar++;
									});
								});

								zip.generateAsync({ type: "blob" })
									.then((blobs) => {
										//console.log('All HTML5 Variation ZIP Ready:', blobs);
										this.alertService.success('HTML5 Variations Ready for download.', { keepAfterRouteChange: true });
										this.generatingDownloads = false;
										saveAs(blobs, 'HTML5-VARIATIONS.zip');
									});
								/**/

							});

					});

			}

		}, 1000);
	}

	/*
	 * Website Step 3 Variations Pagination
	 *
	 */
	public sortData(sort: Sort): void {
	
		const data = this.sortedData.slice();
		if (!sort.active || sort.direction === '') {
			this.sortedData = data;
			return;
		}

		this.sortedData = data.sort((a, b) => {
			const isAsc = sort.direction === 'asc';
			switch (sort.active) {
				case 'id': return this.compare(a.id, b.id, isAsc);
				case 'name': return this.compare(a.name, b.name, isAsc);
				default: return 0;
			}
		});
	}

	private compare(a: number | string | boolean, b: number | string | boolean, isAsc: boolean): number {
	
		return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
	}

	public setPageSizeOptions(setPageSizeOptionsInput: string) {

		if (setPageSizeOptionsInput) {
			this.pageSizeOptions = setPageSizeOptionsInput.split(',').map(str => +str);
		}
	}

	public handlePage(e: any) {

		/** /
		//console.log('Paginating:', e, {
			'previousStage': this.stages[e.previousPageIndex],
			'currentStage': this.stages[e.pageIndex]
		});
		/**/

		this.currentPage = e.pageIndex;
		this.pageSize = e.pageSize;
		this.iterator();
	}

	private iterator() {
	
		const end = (this.currentPage + 1) * this.pageSize;
		const start = this.currentPage * this.pageSize;
		const part = this.variationCollectionForExport.slice(start, end);
		this.sortedData = part;
	}

	private intialisePagination() {

		this.sortedData = this.variationCollectionForExport.slice();
		this.pageLength = this.sortedData.length;
		this.iterator();
	}

	/*
	 * Filter Functions
	 *
	 */
	public onFilterChange(filter: string): void {


		let newdata: any;

		// use form patch value
		// show meta data table when editing
		//this.clientFilterValue.value = '';
		//this.templateFilterValue.value = '';
		///this.bannersizeFilterValue.value = '';
		//this.bannertypeFilterValue.value = '';

		//console.warn('onFilterChange:', filter, this.bannersizeFilterValue.value );

		newdata = this.variationCollectionForExport;

		if (this.bannersizeFilterValue.value && this.bannersizeFilterValue.value !== undefined) {
			newdata = newdata.filter((x: any) => {
				return x.bannersizeId === this.bannersizeFilterValue.value
			});
		}

		this.sortedData = newdata.slice();
		this.pageLength = this.sortedData.length;

		const end = (this.currentPage + 1) * this.pageSize;
		const start = this.currentPage * this.pageSize;
		const part = newdata.slice(start, end);
		this.sortedData = part;

		//this.iterator();

		//this.intialisePagination();
		//this.initialise(newdata);

	}

	/*
	 * Website UI Functions
	 *
	 */
	public back(): void {
		this.location.back();
	}

	public help(): void {
		this.introJS.refresh();

		if (this.activeBannerSizes.length <= 0) {

			this.introJS.setOptions({
				showStepNumbers: true,
				showProgress: true,
				steps: [
					{
						//title: 'Genrating Creatives',
						element: '#select-client-drp',
						intro: "First things first, select a client to view the available Projects and Creatives.",
						position: 'bottom-right-aligned'
					},
					{
						element: '#select-project-drp',
						intro: "Click here to select the project you will be working on.",
						position: 'bottom-right-aligned'
					},
					{
						element: '#select-creative-drp',
						intro: "Select the available list of Creatives available to the Client and selected Project.",
						position: 'bottom-right-aligned'
					},
					{
						//element: '#select-layout-drp',
						intro: "Once you have selected a Creative, A list of available templates will be available. Once you've selected a Template, a List of creative sizes will be available for you to choose before you can move on to the second Step.",
						position: 'bottom-right-aligned'
					}
					/** /
					{
						element: '#select-size-chk',
						intro: "Choose banner size/s to work on.",
						position: 'bottom-right-aligned'
					},
					{
						element: '#next-btn',
						intro: "Click here to proceed to uploading assets. ",
						position: 'bottom-right-aligned'
					},
					/**/
				]
			})
				.onbeforechange(function (targetElement) {
					////console.log('onchange', targetElement);
					if (targetElement.id === 'select-project-drp') {

					}
				});

		} else if (this.activeBannerSizes.length > 0 && this.completedBannerVariationCounter < this.activeBannerSizes.length) {

			this.introJS.setOptions({
				showStepNumbers: true,
				showProgress: true,
				steps: [

					{
						element: '#edit-banner',
						intro: "Click here to upload the required assets for the creative.",
						position: 'bottom-right-aligned'
					},
					{
						element: '#toggle-btn-assets',
						intro: "Click here to open or hide the creative assets dialog for uploading assets.",
						position: 'bottom-left-aligned'
					},
					{
						element: '.variation-status',
						intro: "Once all required assets have been uploaded this indicator will turn green.",
						position: 'bottom-left-aligned'
					},
					{
						element: '#btn-generate',
						intro: "Click here to generate all the variations of the creatives so you can export them. You can preview the variations using the pagination bar at the bottom of the Creative Canvas.",
						position: 'bottom-right-aligned'
					},
					/** /
					{
						element: '.pagination-holder',
						intro: "You can preview the generated variations for each banner size by paginating through the options.",
						position: 'bottom-right-aligned'
					},
					/**/
					{
						element: '#btn-export',
						intro: "Click here to export all the generated createive variations so you can download them.",
						position: 'bottom-right-aligned'
					},
					{
						element: '#btn-download',
						intro: "Click here to go to proceed to the next screen to download all generated variations.",
						position: 'bottom-right-aligned'
					},

				]
			});

		} else if (this.completedBannerVariationCounter === this.activeBannerSizes.length) {

			this.introJS.setOptions({
				showStepNumbers: true,
				showProgress: true,
				steps: [
					{
						element: '#btn-download-all',
						intro: "Click here to download all generated vaiations. You can also download individual variations in the table below.",
						position: 'bottom-left-aligned'
					},
					{
						element: '.model-action-change-creative-name',
						intro: "Click here to change the name of the creative",
						position: 'bottom-left-aligned'
					},
					{
						element: '.model-action-download-creative',
						intro: "Click here to download the creative.",
						position: 'bottom-left-aligned'
					},
					{
						element: '.model-action-preview-creative',
						intro: "You can also click on the preview image to view the full-size creative and edit it's name or download it.",
						position: 'bottom-left-aligned'
					}
				]
			});

		}

		////console.log(this.completedBannerVariationCounter, this.activeBannerSizes.length);

		//this.introJS.addHints();

		//this.introJS.showHints();

		this.introJS.start();

	}

	public toggleUploadWindow(banner: any, container: any) {
		// this.variationsGenerated = false;
		// this.activeBannerSizes.forEach((x: any) => {
		// 	x.readyForVariations = false;
		// });

		//console.log("________________________________________________________start________________________________________________________________________");
		//console.log(banner);
		//console.log(container);

		if (banner.componentWindowOpen === true && container.componentWindowOpen === true) {
			banner.componentWindowOpen = false;
			container.componentWindowOpen = false;

		} else {
			banner.containers.map((x: any) => {
				x.componentWindowOpen = false;
			});
			banner.componentWindowOpen = true;
			container.componentWindowOpen = true;
		}

		//console.log("_____________________________________________________end___________________________________________________________________________");
	}

	public CloseComponentWindow($event: any) {
		console.log("[45]",);
		$event.dataBanner.componentWindowOpen = false;
		$event.dataContainer.componentWindowOpen = false;
	}

	public onOpenedChange(o: boolean) {
		console.log("[46]",);
		//console.log(`Drawer IsOpen: ${o}`);
	}

	public openPreview(variation: any): void {
		console.log("[47]",);
		this.variationCollectionForExport.map((x) => {
			if (x.isOpen === true) {
				this.newVariationNameValue.setValue(x.name, { emitEvent: false });
				x.isOpen = false;
			}
			//x.isOpen = false
		});
		variation.isOpen = true;

		this.variationPreviewConfig(variation);
	}

	private variationPreviewConfig(variation: any): void {
		console.log("[48]", variation);
		console.log(this.newVariationNameValue)
		this.newVariationNameValue = new FormControl('');
		// this.newVariationNameValue = new FormControl('', Validators.required);
		this.newVariationNameValue.patchValue(variation.name);
		console.log(this.newVariationNameValue)
		if (this.newVariationNameValue) {
			this.newVariationNameValue.valueChanges.pipe(takeUntil(this._destroy$)).subscribe((value) => {
				variation.name = value;
			});
		}
	}

	public editVariationName(id: number): void {
		////console.log('id',id);
		const model = this.variationCollectionForExport[id];
		model.isEditingVariation = true;

		const previewDialog = this.dialog.open(DialogEditVariationFormComponent, {
			data: {
				name: model.name,
				model: model
			}
		});

		previewDialog.afterClosed().subscribe(result => {

			if (result === false) {

				this.alertService.info('Creative Name Unchanged.', { keepAfterRouteChange: true });

				model.isEditingVariation = false;

			} else {
				//console.info('Value updated closed:', result);
				model.isEditingVariation = false;
				this.variationCollectionForExport.find((x: any, index: number) => index === id).name = result;
				this.alertService.info('Creative Name Changed Successfully.', { keepAfterRouteChange: true });
			}
		});
	}

	public downloadVariation(id: number): void {
		console.log(this.creativeType);

		if (this.creativeType === 'static') {

			const model = this.variationCollectionForExport[id];

			const anchor = document.createElement("a");
			anchor.setAttribute("download", model.name + '.png');
			anchor.setAttribute("href", model.image);

			anchor.click();

		} else if (this.creativeType === 'GIFs') {

			let model = this.variationCollectionForExport[id];
			////console.log('Download GIF Variation:', id, model);

			model = model.reverse();

			const allFrameImages = [];

			for (let index = 0; index < model.length; index++) {
				const element = model[index];
				allFrameImages.push(this.generateImageFromDataURI(element.image))
			}

			Promise.all(allFrameImages)
				.then((allFrames: any[]) => {
					this.generateGIFs(allFrames)
						.then((gifBlob: any) => {

							window.open(URL.createObjectURL(gifBlob));

						});
				});

		} else if (this.creativeType === 'HTML5') {

			const model = this.variationCollectionForExport[id];

			//console.log('Download HTML5 Variation:', id, model);

			const banner = model[0].bannerComponent;
			const stages: any[] = [];
			model.forEach((x: any) => {
				stages.push(
					{
						components: x.stageComponents,
					}
				)
			});

			this.bannerCreatorService.buildHTML5ForExport(banner, stages)
				.then((files: any) => {
					//console.log('Download HTML5 Variation Files:', files);
				});

		}

	}

	public nextPreviewVariation(id: number): void {
		const model = this.variationCollectionForExport[id];
		const oldmodel = this.variationCollectionForExport[(id - 1)];

		oldmodel.isOpen = false;
		model.isOpen = true;

		this.variationPreviewConfig(model);

	}

	public previousPreviewVariation(id: number): void {
		const model = this.variationCollectionForExport[id];
		const oldmodel = this.variationCollectionForExport[(id + 1)];

		oldmodel.isOpen = false;
		model.isOpen = true;

		this.variationPreviewConfig(model);

	}

	public ListtrackByFn(index: number, item: any) {
		//console.log("WebsitePage ________________________________________________________________[53]",);
		return index; // or item.id
	}

}
@Component({
	selector: 'app-edit-variation-dialog',
	templateUrl: 'dialog.edit.variations.component.html',
	styleUrls: ['dialog.edit.variations.component.scss']
})
export class DialogEditVariationFormComponent implements OnInit {

	public form!: FormGroup;
	//public id!: string;
	//public isAddMode!: boolean;
	public loading = false;
	public submitted = false;

	constructor(
		private alertService: AlertService,
		private formBuilder: FormBuilder,
		public dialogRef: MatDialogRef<DialogEditVariationFormComponent>,
		@Inject(MAT_DIALOG_DATA) public data: any
	) { }

	get f() { return this.form.controls; }
	ngOnInit() {
		//this.isAddMode = !this.id;

		this.form = this.formBuilder.group({
			name: ['', Validators.required]
		});

		this.form.controls['name'].patchValue(this.data.name);

	}

	public onSubmit(): void {
		this.submitted = true;

		//console.warn('value', this.form.value);
		////console.log('Submit',this.submitted);

		// reset alerts on submit
		this.alertService.clear();

		// stop here if form is invalid
		if (this.form.invalid) {
			this.submitted = false;
			this.alertService.error('Variation name can not be empty.', { keepAfterRouteChange: true });
			return;
		}

		this.loading = true;

		this.dialogRef.close(this.form.controls['name'].value);

	}
}
@Component({
	selector: 'preview-dialog',
	templateUrl: './dialog/preview-dialog.html',
	styleUrls: ['./dialog/preview-dialog.scss']
  })
  export class PreviewDialog {
	public websiteSelectedTemplate!: any;
	constructor(
		public dialogRef: MatDialogRef<PreviewDialog>,
		@Inject(MAT_DIALOG_DATA) public data: DialogData,
		private sanitizer: DomSanitizer,
	  ) {
		this.websiteSelectedTemplate = data.name;
		console.log(this.websiteSelectedTemplate.id);
	  }
	  public buildPreviewDocument(template: any): SafeHtml {
		return this.sanitizer.bypassSecurityTrustHtml(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${template.websiteCss || ''}</style></head><body>${template.websiteHtml || ''}<script>${template.websiteJs || ''}<\/script></body></html>`);
	  }
	  onNoClick(): void {
		this.dialogRef.close();
	  }
	  
  }
