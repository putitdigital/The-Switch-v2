import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { DOCUMENT, Location } from '@angular/common';
import { Component, ElementRef, EventEmitter, Inject, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDrawer } from '@angular/material/sidenav';
import { ActivatedRoute, Router } from '@angular/router';
import {
	BottomSheetTemplateRulesComponent,
	DialogBannerComponentAddComponent,
	DialogBannerContainerAddComponent, DialogBannerContainerAnimationAddComponent, DialogBannerContainerEditComponent
} from '@app/components';
import { Account, Banner, BannerSize, BannerType, Client, FontType, Template } from '@app/core/models';
import { AccountService, AlertService, BannerService, BannerSizeService, BannerTypeService, ClientService, ComponentTypeService, ContainerService, FontTypeService, StateDataService, TemplateService } from '@app/core/services';
/**/
import * as timelineModule from 'animation-timeline-js';
/**/
import {
	Timeline, TimelineClickEvent, TimelineDragEvent, TimelineInteractionMode,
	//TimelineKeyframe,
	//Timeline, TimelineModel, TimelineRow, TimelineRowStyle,
	TimelineOptions
} from "animation-timeline-js";
import * as introJs from 'intro.js';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { first, map, takeUntil } from 'rxjs/operators';

type WebsiteTreeNodeType = 'folder' | 'file';

interface WebsiteTreeNode {
	id: string;
	name: string;
	type: WebsiteTreeNodeType;
	children?: WebsiteTreeNode[];
	content?: string;
	mimeType?: string;
}

//import * as GIF from 'gif.js.optimized/dist/gif.js';

// Declaring Global Variables in TypeScript
//https://mariusschulz.com/blog/declaring-global-variables-in-typescript#:~:text=%23Declare%20a%20Global%20Variable,__INITIAL_DATA__%20variable%20directly%20%E2%80%A6
//const GIF = (window as any).GIF;

@Component({
	templateUrl: './add.edit.template.banner.page.html',
	styleUrls: ['./add.edit.template.banner.page.scss'],
	providers: [
		{
			provide: STEPPER_GLOBAL_OPTIONS,
			useValue: {
				showError: true,
				displayDefaultIndicatorType: false
			}
		},
	],
})
export class TemplateBannerAddEditPage implements OnInit, OnDestroy {

	// will use the _destroy$ observable to control
	// fetching items from an observable
	private _destroy$ = new Subject<boolean>();

	// @TODO: Keep track of added components and only allow one type of component name per banner size
	//
	public isLinear = true;
	public panelOpenState = true;

	public TemplateId!: string;
	public BannerId!: string;
	public isAddMode!: boolean;
	public loading = false;
	public submitted = false;

	// container form controls
	public formControlActiveContainer = new FormControl('');
	public formControlActiveContainerOrder = new FormControl('');
	public formControlActiveContainerDuration = new FormControl('');
	public formControlActiveContainerClickThroughURL = new FormControl('');
	public formControlActiveContainerClickThroughName = new FormControl('');
	//public FormGroupEditComponentMeta!: FormGroup;
	//public FormGroupBannerLayout!: FormGroup;

	public pageData$!: Observable<any>;
	public formDataFonts!: FontType[];
	public formDataClients!: Client[];
	public formDataBannerSizes!: BannerSize[];
	public formDataBannerTypes!: BannerType[];
	public formDataComponentType!: any[];//ComponentType[];

	// UI
	public activeBannerSizes: any[] = [];
	//public activeBannerComponents: any[] = [];
	//public activeBannerContainers: any[] = [];
	// this is the component meta data object passed to the add.edit.component.ts
	public componentMetaFiles: any[] = [];
	public activeContainer: any;

	public componentEditUI = false;
	public previewActive = false;
	public containerUpdate = false;
	public editingComponent!: any;
	public editingComponentActionsMenu!: any;

	// animations
	private timeline!: Timeline;
	private TimelineInitialised = false;
	public TimelineOpen = false;
	public animationEditUI = false;
	public editingAnimation!: any;
	public componentAnimations: any[] = [];
	public componentAnimationsOutline: any[] = [];

	@Output() componentAnimationPositionUpdateEventfromPage = new EventEmitter<any>();

	// animations playback controls
	public animation_isPlaying = false;
	public animation_isLooping = false;

	//client!: Client;
	public template!: Template;
	public account!: Account;
	public websiteHtmlCode = '';
	public websiteCssCode = '';
	public websiteJsCode = '';
	public websiteSaveInProgress = false;
	public websitePreviewCollapsed = false;
	public selectedWebsiteEditorTab = 0;
	public selectedWebsiteTreeNodeId = 'project-root';
	public websiteProjectTree: WebsiteTreeNode = {
		id: 'project-root',
		name: 'website putitdigital template',
		type: 'folder',
		children: [
			{
				id: 'project-css',
				name: 'css',
				type: 'folder',
				children: [
					{ id: 'project-css-style', name: 'style.css', type: 'file', content: '', mimeType: 'text/css' }
				]
			},
			{
				id: 'project-js',
				name: 'js',
				type: 'folder',
				children: [
					{ id: 'project-js-main', name: 'main.js', type: 'file', content: '', mimeType: 'application/javascript' }
				]
			},
			{ id: 'project-index', name: 'index.html', type: 'file', content: '', mimeType: 'text/html' }
		]
	};

	// creative rendered and ready
	private creativeReadySubject: BehaviorSubject<boolean | any>;
	public creativeReadyObs: Observable<boolean | any>;

	//new components
	private newComponentSubject: BehaviorSubject<any[] | unknown>;
	public newComponentObs: Observable<any[] | unknown>;

	//updated components
	private updateComponentSubject: BehaviorSubject<any[] | unknown>;
	public updateComponentObs: Observable<any[] | unknown>;

	//unlock component
	private editableComponentsSubject: BehaviorSubject<boolean>;
	public editableComponentsObs: Observable<boolean>;

	//deleted components
	private deleteComponentSubject: BehaviorSubject<any[] | unknown>;
	public deleteComponentObs: Observable<any[] | unknown>;

	//edit components
	private unlockComponentsSubject: BehaviorSubject<any>;
	public unlockComponentObs: Observable<any>;

	//private editableComponentsSubjectForDialog: BehaviorSubject<boolean>;
	//public editableComponentsObsForDialog: Observable<boolean>;

	// component menu actions
	private editableComponentActionMenuSubject: BehaviorSubject<any>;
	public editableComponentActionMenuObs: Observable<any>;

	//edit animations
	//private editableAnimationSubject: BehaviorSubject<boolean>;
	//public editableAnimationObs: Observable<boolean>;

	//private editableAnimationSubjectForDialog: BehaviorSubject<boolean>;
	//public editableAnimationObsForDialog: Observable<boolean>;

	//refresh stage
	private refreshStageSubject: BehaviorSubject<boolean | any>;
	public refreshStageObs: Observable<boolean | any>;

	//play stage animation
	private playStageAnimationSubject: BehaviorSubject<boolean | null>;
	public playStageAnimationObs: Observable<boolean | null>;

	private playGlobalAnimationSubject: BehaviorSubject<boolean | null>;
	public playGlobalAnimationObs: Observable<boolean | null>;

	//loop stage animation
	private loopStageAnimationSubject: BehaviorSubject<boolean>;
	public loopStageAnimationObs: Observable<boolean>;

	//preview stage
	private previewStageSubject: BehaviorSubject<boolean | null>;
	public previewStageObs: Observable<boolean | null>;

	//Download GIF/HTML5
	private generateSubject: BehaviorSubject<boolean>;
	public generateObs: Observable<boolean>;

	// onboarding
	introJS = introJs();

	//@Input() componentPositionUpdate!: any;
	//@Input() componentDelete!: any;
	@Output() componentPositionUpdateEventfromPage = new EventEmitter<any>();

	constructor(
		private formBuilder: FormBuilder,
		private route: ActivatedRoute,
		private router: Router,
		private dialog: MatDialog,
		//private MatDrawer: MatDrawer,
		private _bottomSheet: MatBottomSheet,
		private location: Location,
		private accountService: AccountService,
		private clientService: ClientService,
		private bannerService: BannerService,
		private bannerTypeService: BannerTypeService,
		private bannerSizeService: BannerSizeService,
		private componentTypeService: ComponentTypeService,
		private fontTypeService: FontTypeService,
		private templateService: TemplateService,
		private containerService: ContainerService,
		private alertService: AlertService,
		private elementRef: ElementRef,
		public breakpointObserver: BreakpointObserver,
		private stateDataService: StateDataService,
		private sanitizer: DomSanitizer,
		@Inject(DOCUMENT) private document: Document
	) {

		//this.account = this.accountService.accountValue;

		this.creativeReadySubject = new BehaviorSubject<boolean>(false);
		this.creativeReadyObs = this.creativeReadySubject.asObservable();

		this.newComponentSubject = new BehaviorSubject<any[] | unknown>(null);
		this.newComponentObs = this.newComponentSubject.asObservable();

		this.updateComponentSubject = new BehaviorSubject<any[] | unknown>(null);
		this.updateComponentObs = this.updateComponentSubject.asObservable();

		this.unlockComponentsSubject = new BehaviorSubject<boolean>(false);
		this.unlockComponentObs = this.unlockComponentsSubject.asObservable();

		this.deleteComponentSubject = new BehaviorSubject<any[] | unknown>(null);
		this.deleteComponentObs = this.deleteComponentSubject.asObservable();

		this.editableComponentsSubject = new BehaviorSubject<boolean>(false);
		this.editableComponentsObs = this.editableComponentsSubject.asObservable();

		//this.editableComponentsSubjectForDialog = new BehaviorSubject<boolean>(false);
		//this.editableComponentsObsForDialog = this.editableComponentsSubjectForDialog.asObservable();

		this.editableComponentActionMenuSubject = new BehaviorSubject<boolean>(false);
		this.editableComponentActionMenuObs = this.editableComponentActionMenuSubject.asObservable();

		//this.editableAnimationSubject = new BehaviorSubject<boolean>(false);
		//this.editableAnimationObs = this.editableAnimationSubject.asObservable();

		//this.editableAnimationSubjectForDialog = new BehaviorSubject<boolean>(false);
		//this.editableAnimationObsForDialog = this.editableAnimationSubjectForDialog.asObservable();

		this.playStageAnimationSubject = new BehaviorSubject<boolean | null>(null);
		this.playStageAnimationObs = this.playStageAnimationSubject.asObservable();

		this.playGlobalAnimationSubject = new BehaviorSubject<boolean | null>(null);
		this.playGlobalAnimationObs = this.playGlobalAnimationSubject.asObservable();

		this.loopStageAnimationSubject = new BehaviorSubject<boolean>(false);
		this.loopStageAnimationObs = this.loopStageAnimationSubject.asObservable();

		this.refreshStageSubject = new BehaviorSubject<boolean | any>(false);
		this.refreshStageObs = this.refreshStageSubject.asObservable();

		this.previewStageSubject = new BehaviorSubject<boolean | null>(null);
		this.previewStageObs = this.previewStageSubject.asObservable();

		this.generateSubject = new BehaviorSubject<boolean>(false);
		this.generateObs = this.generateSubject.asObservable();

		this.onboarding();
	}

	// convenience getter for easy access to form fields
	//get ftemplatelayout() { return this.FormGroupBannerLayout.controls; }

	// convenience getter for easy access to form fields for editing components data
	//get ftemplateeditcomponent() { return this.FormGroupEditComponentMeta.controls; }

	@ViewChild('walkthrough01') walkthrough01!: ElementRef<HTMLElement>;
	@ViewChild('drawer') sidedrawer!: MatDrawer;
	@ViewChild('timelineCanvas') timelineCanvas!: ElementRef<HTMLElement>;

	ngOnInit() {

		this.TemplateId = this.route.snapshot.params['id'];
		this.BannerId = this.route.snapshot.params['bannerId'];
		this.isAddMode = !this.BannerId;

		this.initialise();

		this.stateDataService.data.subscribe((dataName) => {

			console.warn('REFRESH MODEL DB:', dataName);

			switch (dataName) {
				case 'animations':
				case 'components':
				case 'containers':
				case 'templates':
					//this.projectService.getAll().subscribe();

					/** /
					this.templateService.getById(this.TemplateId)
					.pipe(first())
					.pipe(takeUntil(this._destroy$))
					.subscribe( (x:any) => {

						console.warn('Template:', x);

						this.template = x;

						this.initialiseDataBasedOnContainer();
						this.intialiseTimeLine();

					});
					/**/

					break;

			}
		});

		/** /
		this.sidedrawer.openedChange.subscribe((o: boolean) => {
			console.log(`Drawer IsOpen: ${o}`);
		});
		/**/

	}

	ngOnDestroy() {
		this.introJS.hideHints();
		this._destroy$.next(false);
		this._destroy$.complete();
	}

	private reinit() {

		//this.creativeReadySubject.next(false);
		/** /
		this.templateService.getById(this.TemplateId)
			.pipe(first())
			.pipe(takeUntil(this._destroy$))
			.subscribe( (x:any) => {

				console.log('Refreshed Template:', x);

				this.template = x;

				this.initialiseDataBasedOnContainer();

				//this.listenToFormInputChanges();

			});
		/** /
		/** /
		this.initialise();
		const refreshInit = setInterval(() => {
			this.ngOnInit();
			clearInterval(refreshInit);
		}, 1000);
		/**/
	}

	private initialise(): void {

		this.accountService.account
			.pipe(takeUntil(this._destroy$))
			.subscribe((x: any) => this.account = x);

		if (!this.isAddMode) {

			this.templateService.getById(this.TemplateId)
				.pipe(first())
				.pipe(takeUntil(this._destroy$))
				.subscribe((x: any) => {

					console.log('Template:', x);

					this.template = x;

					if (this.isWebsiteCreativeType()) {
						this.loadWebsiteCodeFromBanner();
						return;
					}

					this.initialiseDataBasedOnContainer();

					this.listenToFormInputChanges();

				});

		}

		//console.info('Dashboard Component initialise');

		this.pageData$ = combineLatest(
			[
				this.templateService.getAll(),
				this.clientService.getAll(),
				this.bannerTypeService.getAll(),
				this.bannerSizeService.getAll(),
				this.componentTypeService.getAll(),
				this.fontTypeService.getAll()
			]
		)
			.pipe(
				map(([templates, clients, bannertypes, bannersizes, componenttypes, fonttypes]): any => {
					// combineLatest returns an array of values, here we map those values to an object
					return { templates, clients, bannertypes, bannersizes, componenttypes, fonttypes };
				})
			);

		this.pageData$.pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
			//console.info('Edit Template Banner Page Data initialise', data);

			this.prepPageData(data);
		});

	}

	private getActiveBanner(): Banner | undefined {
		return this.template?.banners?.find((banner: any) => String(banner.id) === String(this.BannerId));
	}

	public isWebsiteCreativeType(): boolean {
		const creativeTypeName = this.template?.bannertype?.name;

		return typeof creativeTypeName === 'string' && creativeTypeName.toLowerCase().includes('website');
	}

	public updateWebsiteCode(type: 'html' | 'css' | 'js', value: string): void {
		switch (type) {
			case 'html':
				this.websiteHtmlCode = value;
				break;
			case 'css':
				this.websiteCssCode = value;
				break;
			case 'js':
				this.websiteJsCode = value;
				break;
		}
	}

	public toggleWebsitePreview(): void {
		this.websitePreviewCollapsed = !this.websitePreviewCollapsed;
	}

	public get websiteTreeRows(): Array<{ node: WebsiteTreeNode; depth: number }> {
		const rows: Array<{ node: WebsiteTreeNode; depth: number }> = [
			{ node: this.websiteProjectTree, depth: 0 }
		];

		this.flattenWebsiteTree(this.websiteProjectTree.children || [], 1, rows);

		return rows;
	}

	public selectWebsiteTreeNode(nodeId: string): void {
		this.selectedWebsiteTreeNodeId = nodeId;
	}

	public onWebsiteTreeNodeClick(node: WebsiteTreeNode): void {
		this.selectWebsiteTreeNode(node.id);

		if (node.type !== 'file') {
			return;
		}

		this.setWebsiteEditorTabByFileName(node.name);
	}

	public addWebsiteFolder(): void {
		const folderName = window.prompt('Enter folder name');
		const trimmedFolderName = folderName ? folderName.trim() : '';

		if (!trimmedFolderName) {
			return;
		}

		const targetFolder = this.getWebsiteTreeTargetFolder();
		targetFolder.children = targetFolder.children || [];

		const newFolder: WebsiteTreeNode = {
			id: this.createWebsiteTreeId(),
			name: trimmedFolderName,
			type: 'folder',
			children: []
		};

		targetFolder.children.push(newFolder);
		this.selectedWebsiteTreeNodeId = newFolder.id;
	}

	public addWebsiteFile(): void {
		const fileName = window.prompt('Enter file name (example: about.html)');
		const trimmedFileName = fileName ? fileName.trim() : '';

		if (!trimmedFileName) {
			return;
		}

		const targetFolder = this.getWebsiteTreeTargetFolder();
		targetFolder.children = targetFolder.children || [];

		const newFile: WebsiteTreeNode = {
			id: this.createWebsiteTreeId(),
			name: trimmedFileName,
			type: 'file',
			content: '',
			mimeType: this.getWebsiteFileMimeType(trimmedFileName)
		};

		targetFolder.children.push(newFile);
		this.selectedWebsiteTreeNodeId = newFile.id;
		this.setWebsiteEditorTabByFileName(newFile.name);
	}

	public renameWebsiteTreeNode(): void {
		const selectedNode = this.findWebsiteTreeNodeById(this.websiteProjectTree, this.selectedWebsiteTreeNodeId);

		if (!selectedNode) {
			return;
		}

		if (selectedNode.id === this.websiteProjectTree.id) {
			return;
		}

		const updatedName = window.prompt('Enter new name', selectedNode.name);
		const trimmedUpdatedName = updatedName ? updatedName.trim() : '';

		if (!trimmedUpdatedName) {
			return;
		}

		selectedNode.name = trimmedUpdatedName;

		if (selectedNode.type === 'file') {
			this.setWebsiteEditorTabByFileName(selectedNode.name);
		}
	}

	public deleteWebsiteTreeNode(): void {
		const selectedNode = this.findWebsiteTreeNodeById(this.websiteProjectTree, this.selectedWebsiteTreeNodeId);

		if (!selectedNode || selectedNode.id === this.websiteProjectTree.id) {
			return;
		}

		const parentNode = this.findWebsiteTreeParentById(this.websiteProjectTree, selectedNode.id);

		if (!parentNode || !parentNode.children) {
			return;
		}

		const confirmDelete = window.confirm(`Delete "${selectedNode.name}"?`);

		if (!confirmDelete) {
			return;
		}

		parentNode.children = parentNode.children.filter((childNode: WebsiteTreeNode) => childNode.id !== selectedNode.id);
		this.selectedWebsiteTreeNodeId = parentNode.id;
	}

	private flattenWebsiteTree(
		nodes: WebsiteTreeNode[],
		depth: number,
		rows: Array<{ node: WebsiteTreeNode; depth: number }>
	): void {
		nodes.forEach((node: WebsiteTreeNode) => {
			rows.push({ node, depth });

			if (node.type === 'folder' && node.children && node.children.length > 0) {
				this.flattenWebsiteTree(node.children, depth + 1, rows);
			}
		});
	}

	private getWebsiteTreeTargetFolder(): WebsiteTreeNode {
		const selectedNode = this.findWebsiteTreeNodeById(this.websiteProjectTree, this.selectedWebsiteTreeNodeId);

		if (!selectedNode) {
			return this.websiteProjectTree;
		}

		if (selectedNode.type === 'folder') {
			return selectedNode;
		}

		return this.findWebsiteTreeParentById(this.websiteProjectTree, selectedNode.id) || this.websiteProjectTree;
	}

	private findWebsiteTreeNodeById(node: WebsiteTreeNode, nodeId: string): WebsiteTreeNode | undefined {
		if (node.id === nodeId) {
			return node;
		}

		if (!node.children || node.children.length === 0) {
			return undefined;
		}

		for (const childNode of node.children) {
			const foundNode = this.findWebsiteTreeNodeById(childNode, nodeId);

			if (foundNode) {
				return foundNode;
			}
		}

		return undefined;
	}

	private findWebsiteTreeParentById(
		node: WebsiteTreeNode,
		nodeId: string,
		parentNode?: WebsiteTreeNode
	): WebsiteTreeNode | undefined {
		if (node.id === nodeId) {
			return parentNode;
		}

		if (!node.children || node.children.length === 0) {
			return undefined;
		}

		for (const childNode of node.children) {
			const foundParent = this.findWebsiteTreeParentById(childNode, nodeId, node);

			if (foundParent) {
				return foundParent;
			}
		}

		return undefined;
	}

	private createWebsiteTreeId(): string {
		return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	private setWebsiteEditorTabByFileName(fileName: string): void {
		const normalizedFileName = fileName.toLowerCase();

		if (normalizedFileName.endsWith('.html')) {
			this.selectedWebsiteEditorTab = 0;
			return;
		}

		if (normalizedFileName.endsWith('.css')) {
			this.selectedWebsiteEditorTab = 1;
			return;
		}

		if (normalizedFileName.endsWith('.js')) {
			this.selectedWebsiteEditorTab = 2;
		}
	}

	private getWebsiteFileMimeType(fileName: string): string | undefined {
		const normalizedFileName = fileName.toLowerCase();

		if (normalizedFileName.endsWith('.html')) {
			return 'text/html';
		}

		if (normalizedFileName.endsWith('.css')) {
			return 'text/css';
		}

		if (normalizedFileName.endsWith('.js')) {
			return 'application/javascript';
		}

		return undefined;
	}

	private upsertWebsiteFileNode(path: string[], content: string, mimeType: string): void {
		if (path.length === 0) {
			return;
		}

		let currentNode = this.websiteProjectTree;

		for (let index = 0; index < path.length - 1; index++) {
			const folderName = path[index];
			currentNode.children = currentNode.children || [];

			let nextFolder = currentNode.children.find((childNode: WebsiteTreeNode) =>
				childNode.type === 'folder' && childNode.name.toLowerCase() === folderName.toLowerCase());

			if (!nextFolder) {
				nextFolder = {
					id: this.createWebsiteTreeId(),
					name: folderName,
					type: 'folder',
					children: []
				};
				currentNode.children.push(nextFolder);
			}

			currentNode = nextFolder;
		}

		const fileName = path[path.length - 1];
		currentNode.children = currentNode.children || [];

		let fileNode = currentNode.children.find((childNode: WebsiteTreeNode) =>
			childNode.type === 'file' && childNode.name.toLowerCase() === fileName.toLowerCase());

		if (!fileNode) {
			fileNode = {
				id: this.createWebsiteTreeId(),
				name: fileName,
				type: 'file',
				content: '',
				mimeType
			};
			currentNode.children.push(fileNode);
		}

		fileNode.content = content;
		fileNode.mimeType = mimeType;
	}

	private syncWebsiteTreeFromEditors(): void {
		this.upsertWebsiteFileNode(['index.html'], this.websiteHtmlCode || '', 'text/html');
		this.upsertWebsiteFileNode(['css', 'style.css'], this.websiteCssCode || '', 'text/css');
		this.upsertWebsiteFileNode(['js', 'main.js'], this.websiteJsCode || '', 'application/javascript');
	}

	private getWebsiteFileContent(path: string[]): string {
		let currentNode: WebsiteTreeNode | undefined = this.websiteProjectTree;

		for (let index = 0; index < path.length; index++) {
			const segment = path[index];
			const isFile = index === path.length - 1;

			if (!currentNode?.children || currentNode.children.length === 0) {
				return '';
			}

			currentNode = currentNode.children.find((childNode: WebsiteTreeNode) => {
				if (childNode.name.toLowerCase() !== segment.toLowerCase()) {
					return false;
				}

				return isFile ? childNode.type === 'file' : childNode.type === 'folder';
			});

			if (!currentNode) {
				return '';
			}
		}

		return currentNode.type === 'file' ? (currentNode.content || '') : '';
	}

	private syncEditorsFromWebsiteTree(): void {
		this.websiteHtmlCode = this.getWebsiteFileContent(['index.html']);
		this.websiteCssCode = this.getWebsiteFileContent(['css', 'style.css']);
		this.websiteJsCode = this.getWebsiteFileContent(['js', 'main.js']);
	}

	private buildWebsiteTreeFromBannerFiles(websiteFiles: any[]): WebsiteTreeNode | undefined {
		if (!Array.isArray(websiteFiles) || websiteFiles.length === 0) {
			return undefined;
		}

		const rows = websiteFiles
			.filter((item: any) => item && item.name && item.nodeType)
			.map((item: any, index: number) => ({
				id: String(item.id ?? `node-${index}`),
				parentId: item.parentId !== undefined && item.parentId !== null ? String(item.parentId) : null,
				name: String(item.name),
				type: (item.nodeType === 'folder' ? 'folder' : 'file') as WebsiteTreeNodeType,
				content: item.nodeType === 'file' ? (item.content ?? '') : undefined,
				mimeType: item.mimeType || this.getWebsiteFileMimeType(String(item.name)),
				sortOrder: Number.isInteger(item.sortOrder) ? item.sortOrder : index,
			}))
			.sort((a, b) => a.sortOrder - b.sortOrder);

		if (rows.length === 0) {
			return undefined;
		}

		const nodesById = new Map<string, WebsiteTreeNode>();

		rows.forEach((row) => {
			nodesById.set(row.id, {
				id: row.id,
				name: row.name,
				type: row.type,
				content: row.type === 'file' ? row.content : undefined,
				mimeType: row.type === 'file' ? row.mimeType : undefined,
				children: row.type === 'folder' ? [] : undefined,
			});
		});

		const syntheticRoot: WebsiteTreeNode = {
			id: 'project-root',
			name: 'website putitdigital template',
			type: 'folder',
			children: []
		};

		rows.forEach((row) => {
			const node = nodesById.get(row.id);

			if (!node) {
				return;
			}

			if (!row.parentId) {
				syntheticRoot.children?.push(node);
				return;
			}

			const parentNode = nodesById.get(row.parentId);

			if (!parentNode || parentNode.type !== 'folder') {
				syntheticRoot.children?.push(node);
				return;
			}

			parentNode.children = parentNode.children || [];
			parentNode.children.push(node);
		});

		if (!syntheticRoot.children || syntheticRoot.children.length === 0) {
			return undefined;
		}

		if (syntheticRoot.children.length === 1 && syntheticRoot.children[0].type === 'folder') {
			return syntheticRoot.children[0];
		}

		return syntheticRoot;
	}

	public resetWebsiteCode(): void {
		const templateName = this.template?.name || 'Website Creative';
		const clientName = this.template?.client?.name || 'Client';

		this.websiteHtmlCode = `<main class="website-creative">
	  <section class="hero">
	    <p class="eyebrow">${clientName}</p>
	    <h1>${templateName}</h1>
	    <p class="lede">Replace this starter markup with the website content you want to design for this template.</p>
	    <a class="cta" href="#">Call to action</a>
	  </section>
	</main>`;

		this.websiteCssCode = `:root {
	  color-scheme: light;
	  --bg: #f4efe8;
	  --panel: #fffaf3;
	  --text: #1c1b1a;
	  --accent: #0f766e;
	}

	* {
	  box-sizing: border-box;
	}

	body {
	  margin: 0;
	  font-family: Georgia, "Times New Roman", serif;
	  background: linear-gradient(135deg, var(--bg), #e8ded2);
	  color: var(--text);
	}

	.website-creative {
	  min-height: 100vh;
	  display: grid;
	  place-items: center;
	  padding: 48px 24px;
	}

	.hero {
	  max-width: 720px;
	  padding: 48px;
	  border-radius: 24px;
	  background: var(--panel);
	  box-shadow: 0 24px 60px rgba(28, 27, 26, 0.12);
	}

	.eyebrow {
	  margin: 0 0 12px;
	  text-transform: uppercase;
	  letter-spacing: 0.18em;
	  font-size: 12px;
	  color: var(--accent);
	}

	h1 {
	  margin: 0;
	  font-size: clamp(2.5rem, 6vw, 4.5rem);
	}

	.lede {
	  font-size: 1.05rem;
	  line-height: 1.7;
	}

	.cta {
	  display: inline-block;
	  margin-top: 16px;
	  padding: 12px 18px;
	  border-radius: 999px;
	  background: var(--accent);
	  color: #fff;
	  text-decoration: none;
	}`;

		this.websiteJsCode = `const cta = document.querySelector('.cta');

	if (cta) {
	  cta.addEventListener('click', (event) => {
	    event.preventDefault();
	    window.alert('Attach your website action here.');
	  });
	}`;
	}

	private loadWebsiteCodeFromBanner(): void {
		const activeBanner = this.getActiveBanner();

		if (!activeBanner) {
			this.resetWebsiteCode();
			return;
		}

		const websiteTreeFromBanner = this.buildWebsiteTreeFromBannerFiles(activeBanner.websiteFiles || []);

		if (websiteTreeFromBanner) {
			this.websiteProjectTree = websiteTreeFromBanner;
			this.selectedWebsiteTreeNodeId = this.websiteProjectTree.id;
			this.syncEditorsFromWebsiteTree();

			if (!this.websiteHtmlCode && !this.websiteCssCode && !this.websiteJsCode &&
				(activeBanner.websiteHtml || activeBanner.websiteCss || activeBanner.websiteJs)) {
				this.websiteHtmlCode = activeBanner.websiteHtml || '';
				this.websiteCssCode = activeBanner.websiteCss || '';
				this.websiteJsCode = activeBanner.websiteJs || '';
			}

			return;
		}

		if (activeBanner.websiteHtml || activeBanner.websiteCss || activeBanner.websiteJs) {
			this.websiteHtmlCode = activeBanner.websiteHtml || '';
			this.websiteCssCode = activeBanner.websiteCss || '';
			this.websiteJsCode = activeBanner.websiteJs || '';
			this.syncWebsiteTreeFromEditors();
			return;
		}

		this.resetWebsiteCode();
		this.syncWebsiteTreeFromEditors();
	}

	public saveWebsiteCode(): void {
		const activeBanner = this.getActiveBanner();

		if (!activeBanner) {
			this.alertService.error('No active banner was found for saving website code.');
			return;
		}

		this.websiteSaveInProgress = true;
		this.syncWebsiteTreeFromEditors();

		this.bannerService.update(String(activeBanner.id), {
			name: activeBanner.name,
			description: activeBanner.description,
			templateId: activeBanner.templateId,
			bannertypeId: activeBanner.bannertypeId,
			bannersizeId: activeBanner.bannersizeId,
			websiteHtml: this.websiteHtmlCode,
			websiteCss: this.websiteCssCode,
			websiteJs: this.websiteJsCode,
			websiteProjectTree: this.websiteProjectTree,
		})
			.pipe(first())
			.subscribe({
				next: (updatedBanner: Banner) => {
					activeBanner.websiteHtml = updatedBanner.websiteHtml ?? this.websiteHtmlCode;
					activeBanner.websiteCss = updatedBanner.websiteCss ?? this.websiteCssCode;
					activeBanner.websiteJs = updatedBanner.websiteJs ?? this.websiteJsCode;
					activeBanner.websiteFiles = updatedBanner.websiteFiles || [];

					const refreshedTree = this.buildWebsiteTreeFromBannerFiles(updatedBanner.websiteFiles || []);

					if (refreshedTree) {
						this.websiteProjectTree = refreshedTree;
						this.selectedWebsiteTreeNodeId = this.websiteProjectTree.id;
						this.syncEditorsFromWebsiteTree();
					}

					this.websiteSaveInProgress = false;
					this.alertService.success('Website code saved successfully.', { keepAfterRouteChange: true });
				},
				error: (error: string) => {
					this.websiteSaveInProgress = false;
					this.alertService.error(error);
				}
			});
	}

	private getPreviewBaseHref(): string {
		return this.document?.baseURI || this.document?.location?.origin || '/';
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

	public get websitePreviewDocument(): SafeHtml {
		const head = this.extractWebsiteHead(this.websiteHtmlCode || '');
		const html = this.normalizeWebsiteHtml(this.websiteHtmlCode || '');
		const css = this.normalizeWebsiteCss(this.websiteCssCode || '');
		const js = this.normalizeWebsiteJs(this.websiteJsCode || '');
		const baseHref = this.getPreviewBaseHref();

		return this.sanitizer.bypassSecurityTrustHtml(`<!doctype html>
	<html lang="en">
	<head>
	  <meta charset="utf-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1">
	  <base href="${baseHref}">
	  ${head}
	  <style>${css}</style>
	</head>
	<body>
	  ${html}
	  <script>${js}<\/script>
	</body>
	</html>`);
	}

	public creativeReady($event: any): void {

		if ($event === true) {
			this.creativeReadySubject.next(true);
		} else {
			this.creativeReadySubject.next(false);
		}
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

	/**
	 * SWITCH BETWEEN CREATIVE FRAMES / CONTAINERS
	 */
	private listenToFormInputChanges() {
		this.formControlActiveContainer.valueChanges.pipe(takeUntil(this._destroy$)).subscribe((value: number) => {

			const banner = this.template.banners.find((y: any) => y.id == this.BannerId);
			const container = banner.containers.find((y: any) => y.id == value);

			//this.closeActiveAnimationEdit();
			//this.closeActiveComponentActionsMenu();
			//this.resetTimeline();

			this.initialiseContainerComponentMetaData(
				container,
				banner
			);

			this.formControlActiveContainerOrder.patchValue(this.activeContainer.displayorder);
			this.formControlActiveContainerDuration.patchValue(this.activeContainer.duration);
			this.formControlActiveContainerClickThroughURL.patchValue(this.activeContainer.clickThroughURL);
			this.formControlActiveContainerClickThroughName.patchValue(this.activeContainer.clickThroughName);

			this.refreshBanner(this.activeContainer);

			//if( this.TimelineOpen === true ) {
			this.intialiseTimeLine();
			//}

		});

		this.formControlActiveContainerOrder.valueChanges.pipe(takeUntil(this._destroy$)).subscribe((value: number) => {

			console.log('Active Container:', this.activeContainer);
			console.log('Active Container Order:', value);

			//this.containerUpdate = true;
			//this.formControlActiveContainer.disable();

			this.activeContainer.displayorder = value;

			//this.updateContainer();
		});

		this.formControlActiveContainerDuration.valueChanges.pipe(takeUntil(this._destroy$)).subscribe((value: number) => {

			console.log('Active Container:', this.activeContainer);
			console.log('Active Container Duration:', value);

			//this.containerUpdate = true;
			//this.formControlActiveContainer.disable();

			this.activeContainer.duration = value;

			//this.updateContainer();
		});
	}

	/**
	 * EVENTS FOR EDITING CANVAS COMPONENTS
	 */

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

	// component menu actions
	public selectComponentFromControlMenu(event: any): void {

		this.componentEditUI = true;

		const component = this.activeContainer.components.find((y: any) => y.id == event.id);

		console.log('selectComponentFromControlMenu:', event, component);

		this.editingComponentActionsMenu = component;
		this.editableComponentActionMenuSubject.next(component);

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

	public activeComponentsActionMenu(event: any): void {

		this.componentEditUI = true;
		console.log('activeComponentsActionMenu:', event);
		this.editingComponentActionsMenu = event;
		this.editableComponentActionMenuSubject.next(event);
	}

	public closeActiveComponentActionsMenu(): void {

		this.componentEditUI = false;

		this.editingComponentActionsMenu = null;
		this.editableComponentActionMenuSubject.next(false);
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

	/**
	 * Sends component unlock status emitted through
	 * EditComponentEvent from add.edit.component.ts
	 * to banner.creator.component.ts updateComponentObs
	 * is subscribed to banner.creator.directive.ts
	 *
	 */
	public unlockComponent(data: any) {

		//console.warn('Unlock Component:', data );

		this.unlockComponentsSubject.next({
			//stage: 'bannerCanvas-'+ data.component.bannerWidth +'-'+ data.component.bannerHeight,
			//stages: 1,
			name: data.component.name.toLowerCase(),
			data: data.status
		});
	}

	/**/
	public editComponent(data: any) {

		//this.componentMetaFiles.push(component);

		//console.warn('Template Page Pass Component Updates to Banner Creator:', data );

		if (data.component.componenttypeName === 'Image') {

			if (data.component.componentmeta.newimage !== undefined && data.component.componentmeta.newimage === true) {

				//console.warn('New Image update page component meta and container meta:', data );

				// update component in active container as well
				this.activeContainer.components
					.find((x: any) => x.id == data.component.componentId).componentmeta
					.filter((y: any) => {
						if (y.name == 'path') {
							y.value = data.component.componentmeta.path;

							// update meta files
							this.componentMetaFiles = this.componentMetaFiles.filter(x => x.id !== data.component.componentId);
							this.componentMetaFiles.push(y);

							//console.warn('Updated Container Components and ComponentMetaFiles', y );
						}
					});

			} else {
				//console.warn('Temp Image no updates:', data, this.componentMetaFiles );
			}

		}

		// edit animations as well.
		console.log('edit animations as well:', this.componentAnimations, data);

		/**/
		this.updateComponentSubject.next({
			stage: data.stage,
			stages: 1,
			type: data.type,
			data: data.component
		});
		/**/
	}
	/**/

	public deleteComponent(component: any) {

		//this.componentMetaFiles.push(component);

		console.warn('Delete Component:', component);
		//console.info('Template editComponent:', component, this.updateComponentSubject);

		this.componentMetaFiles = this.componentMetaFiles.filter(x => x.id !== component.id);

		// does component have animations?
		this.componentAnimations = this.componentAnimations.filter(x => x.componentId !== component.id);

		// remove from active container as well
		this.activeContainer.components = this.activeContainer.components.filter((x: any) => x.id !== component.id);

		/**/
		this.deleteComponentSubject.next({
			stage: 'bannerCanvas-' + component.bannerWidth + '-' + component.bannerHeight,
			stages: 1,
			type: component.componenttype.name.toLowerCase(),
			data: component
		});
		/**/
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

	/**
	 * ANIMATIONS
	 */
	// https://github.com/ievgennaida/animation-timeline-control
	private intialiseTimeLine() {

		this.resetTimeline();

		this.timeline = new timelineModule.Timeline({
			id: 'timeline',
			headerHeight: 62
		} as TimelineOptions
		);

		const rows: any[] = [];

		// Accepts the array and key
		const groupBy = (array: any, key: string) => {
			// Return the end result
			return array.reduce((result: any, currentValue: any) => {
				// If an array already present for key, push it to the array. Else create an array and push the object
				(result[currentValue[key]] = result[currentValue[key]] || []).push(
					currentValue
				);
				// Return the current iteration `result` value, this will be taken as next iteration `result` value and accumulate
				return result;
			}, {}); // empty object is the initial value for result object
		}

		const byComponent = groupBy(this.componentAnimations, 'componentId');

		console.log('GroupBy Component:', byComponent );

		for (const key in byComponent) {
			if (Object.prototype.hasOwnProperty.call(byComponent, key)) {
				const value = byComponent[key];

				const animations = value.map((animation: any) => animation.animationmeta);
				const keyframez: any[] = [];
				animations.forEach((animation: any) => {

					const ofInterest = animation.find((keyframe: any) => {
						if (keyframe.name === 'startTime') {
							console.log('keyframe:', keyframe);
							return {
								animationId: keyframe.animationId,
								value: keyframe.value
							}
						} else {
							return false;
						}
					});

					if (ofInterest) {

						keyframez.push(
							{
								animationId: ofInterest.animationId,
								val: ofInterest.value * 1000,
								fillColor: '#fdcc09'
							}
						)
					}
				});

				rows.push(
					{
						title: value[0].name,
						componentName: (this.activeContainer.components.find((meta: any) => meta.id === value[0].componentId).name),
						group: value[0].componentId,
						max: this.activeContainer.duration * 1000,
						height: 40,
						keyframes: keyframez
					}
				);
			}
		}

		this.componentAnimationsOutline = rows;

		this.timeline.setModel({
			rows: rows
		});

		this.timelineEventListners();

		/* generate outline left nodes */
		const options = this.timeline.getOptions();
		const headerElement = document.getElementById('outline-header');
		if (headerElement) {
			headerElement.style.maxHeight = headerElement.style.minHeight = options.headerHeight + 'px';
		}

		//this.timeline.redraw();

		//console.warn('this.timeline:', this.timeline);

		this.timeline.setInteractionMode(TimelineInteractionMode.Pan);

		// Set scroll back to timeline when mouse scroll over the outline
		//function outlineMouseWheel(event:WheelEvent) {
		//	if (this.timeline) {
		//		this.timeline._handleWheelEvent(event);
		//	}
		//}

	}

	private activeKeyFrame: any;

	private timelineEventListners(): void {

		this.timeline.onDragStarted((args: TimelineDragEvent) => {
			if (args) {

				if (this.animationEditUI === false) {

					const keyframe = args.target.keyframe as any;
					const animationDetails = this.componentAnimations.find((animation: any) => animation.id === keyframe.animationId);

					this.activeAnimationsEdit(animationDetails);

				}

			}
		});

		this.timeline.onDragFinished((args: TimelineDragEvent) => {
			if (args) {
				console.log('onDragFinished:', args);

				const keyframe = args.target.keyframe as any;
				const animationDetails = this.componentAnimations.find((animation: any) => animation.id === keyframe.animationId);

				this.componentAnimationPositionUpdateEventfromPage.emit({
					posData: args.pos,
					keyframe: keyframe,
					animation: animationDetails
				});
			}
		});

		this.timeline.onDoubleClick((args: TimelineClickEvent) => {
			if (args) {

				console.log('onDoubleClick:', args.target);

				if (args.target?.type === 'keyframe') {

					const keyframe = args.target.keyframe as any;
					const animationDetails = this.componentAnimations.find((animation: any) => animation.id === keyframe.animationId);

					//keyframe.fillColor = '#c2185b';

					console.log('Keyframe selected:', {
					'row': args.target.row,
						'keyframe': args.target.keyframe,
							'animation': animationDetails
				});

		//this.activeKeyFrame = args.target.keyframe;

		this.activeAnimationsEdit(animationDetails);
		//this.editingAnimation = animationDetails;

	}
}
		});

		/** /
		this.timeline.onKeyframeChanged((args: TimelineKeyframeChangedEvent) => {
			if (args) {
				console.log('onKeyframeChanged:', args);
			}
		});

		this.timeline.onSelected((args: TimelineSelectedEvent) => {
			if (args) {
				console.log('onSelected:', args);
			}
		});
		this.timeline.onTimeChanged((args: TimelineTimeChangedEvent) => {
			if (args) {
				console.log('onTimeChanged:', args);
			}
		});
		this.timeline.onDrag((args: TimelineDragEvent) => {
			if (args) {
				console.log('onDrag:', args);
			}
		});
		this.timeline.onDragStarted((args: TimelineDragEvent) => {
			if (args) {
				console.log('onDragStarted:', args);
			}
		});
		this.timeline.onDragFinished((args: TimelineDragEvent) => {
			if (args) {
				console.log('onDragFinished:', args);
			}
		});
		this.timeline.onMouseDown((args: TimelineClickEvent) => {
			if (args) {
				console.log('onMouseDown:', args);
			}
		});
		this.timeline.onDoubleClick((args: TimelineClickEvent) => {
			if (args) {
				console.log('onDoubleClick:', args);
			}
		});
		this.timeline.onScroll((args: TimelineScrollEvent) => {
			if (args) {
				console.log('TimelineScrollEvent:', args);
			}
		});
		/**/

	}

	/*Handle Animation Events*/
	public animationSelectMode(): void {
	if(this.timeline) {
	this.timeline.setInteractionMode(TimelineInteractionMode.Selection);
}
	}
	public animationPanMode(): void {
	if(this.timeline) {
	this.timeline.setInteractionMode(TimelineInteractionMode.Pan);
}
	}
	public animationZoomMode(): void {
	if(this.timeline) {
	this.timeline.setInteractionMode(TimelineInteractionMode.Zoom);
}
	}

	public onOpenedChange(o: boolean) {
	console.log(`Drawer IsOpen: ${o}`);

	this.TimelineOpen = o;

	if (o === true && this.TimelineInitialised === false) {
		this.TimelineInitialised = true;
		this.intialiseTimeLine();
		//this.timeline.redraw();
	}

	if (o === false) {
		console.log('disposing timeline');
		this.closeActiveAnimationEdit();
	}
}

	public addAnimationDialog(component: any) {

	const confirmDialog = this.dialog.open(DialogBannerContainerAnimationAddComponent, {
		width: '500px',
		data: {
			title: 'Add Animation to ' + component.name + ' component?',
			message: '',
			component: component,
			template: this.template,
			container: this.activeContainer,
			activeBannerSize: this.activeBannerSizes[0],
		}
	});
	confirmDialog.afterClosed().subscribe(result => {

		console.log('Animation from dialog:', result);

		if ([undefined, null, false].includes(result)) {

			this.alertService.info('Cancel Adding Animation to Component ' + component.name, { keepAfterRouteChange: false });

		} else {

			this.alertService.success(component.name + ' animation added successfully.', { keepAfterRouteChange: false });

			console.log('passAnimation from dialog:', result, this.componentAnimations);

			//find animation from container:
			this.activeContainer.components.find((x: any) => {
				if (x.id === result.componentId) {
					x.animations.push(result);
					this.updateComponentSubject.next({
						stage: 'bannerCanvas-' + this.activeBannerSizes[0].bannersize.width + '-' + this.activeBannerSizes[0].bannersize.height,
						stages: 1,
						type: x.componenttype.name,
						data: result.component
					});

					this.refreshStageSubject.next(true);
				}
			});

			this.componentAnimations.push(result);

			this.intialiseTimeLine();

		}
	});
}

	public editAnimationDialog(id: string) {

	const component = (this.componentMetaFiles.find((meta: any) => meta.id === id));

	const confirmDialog = this.dialog.open(DialogBannerContainerAnimationAddComponent, {
		data: {
			title: 'Editing ' + component.name + ' animation',
			message: '',
			component: component,
			template: this.template,
			container: this.activeContainer,
			activeBannerSize: this.activeBannerSizes[0],
		}
	});
	confirmDialog.afterClosed().subscribe(result => {

		console.log('Animation from dialog:', result);

		if ([undefined, null, false].includes(result)) {

			this.alertService.info('Cancel Adding Animation to Component ' + component.name, { keepAfterRouteChange: false });

		} else {

			console.log('passAnimation from dialog:', result);
			this.alertService.success(component.name + ' animation edited successfully.', { keepAfterRouteChange: false });

		}
	});
}

	public addAnimationDialogByKeyframe(id: string) {

	const component = (this.componentMetaFiles.find((meta: any) => meta.id === id));

	const confirmDialog = this.dialog.open(DialogBannerContainerAnimationAddComponent, {
		width: '500px',
		data: {
			title: 'Add Keyframe to ' + component.name + ' component?',
			message: '',
			component: component,
			template: this.template,
			container: this.activeContainer,
			activeBannerSize: this.activeBannerSizes[0],
		}
	});
	confirmDialog.afterClosed().subscribe(result => {

		console.log('Animation from dialog:', result);

		if ([undefined, null, false].includes(result)) {

			this.alertService.info('Cancel Adding Animation to Component ' + component.name, { keepAfterRouteChange: false });

		} else {

			console.log('passAnimation from dialog:', result);
			this.alertService.success(component.name + ' animation added successfully.', { keepAfterRouteChange: false });

			this.componentAnimations.push(result);

			//find animation from container:
			this.activeContainer.components.find((x: any) => {
				if (x.id === result.componentId) {
					x.animations.push(result);
					this.updateComponentSubject.next({
						stage: 'bannerCanvas-' + this.activeBannerSizes[0].bannersize.width + '-' + this.activeBannerSizes[0].bannersize.height,
						stages: 1,
						type: x.componenttype.name,
						data: result.component
					});

					this.refreshStageSubject.next(true);
				}
			});

			this.intialiseTimeLine();

		}
	});
}

	private resetTimeline() {
	const timelineCanvas = this.timelineCanvas.nativeElement.querySelector('canvas');
	const context = this.timelineCanvas.nativeElement.querySelector('canvas')?.getContext('2d');

	console.log('timelineCanvas:', timelineCanvas );

	if (timelineCanvas && context) {
		context.clearRect(0, 0, timelineCanvas.offsetWidth, timelineCanvas.offsetHeight);
		timelineCanvas.remove();
	}
}

	/**
	 * Dialog for editing animation keyframe
	 */
	public activeAnimationsEdit(event: any): void {

	if(this.animationEditUI === true ) {
	this.animationEditUI = false;
	this.editingAnimation = null;
} else {

	this.animationEditUI = true;
	this.editingAnimation = event;

}
		//this.editableAnimationSubjectForDialog.next(event);
		//this.editableAnimationSubject.next(event);
	}

	/**
	 * Close animation edit dialog
	 */
	public closeActiveAnimationEdit(): void {

	this.animationEditUI = false;
	this.editingAnimation = null;
}

	/**
	 * Sends animtion updates emitted through
	 * EditAnimationEvent from edit.template.banner.component.animation.dialog.ts
	 * to banner.creator.component.ts updateComponentObs
	 * is subscribed to banner.creator.directive.ts
	 *
	 */
	public editAnimation(component: any) {

	//console.warn('editAnimation:', component, this.componentAnimations , this.timeline.getAllKeyframes() );

	const selectedKeyframe = this.timeline.getAllKeyframes().find((keyframe: any) => keyframe.animationId === component.animationId) as any;

	//console.warn('editAnimation:', selectedKeyframe, component );
	//const staleComponent = this.componentAnimations.find((x)=> {
	this.componentAnimations.find((x) => {
		if (x.id === component.animationId) {

			x.animationmeta.forEach((y: any) => {
				if (y.name === 'positionX') {
					y.value = component.animationmeta.positionX;
				}
				if (y.name === 'positionY') {
					y.value = component.animationmeta.positionY;
				}
				if (y.name === 'startTime') {
					y.value = component.animationmeta.startTime;
					selectedKeyframe.val = parseInt(component.animationmeta.startTime) * 1000;
					selectedKeyframe.fillColor = '#007663';
				}
				if (y.name === 'duration') {
					y.value = component.animationmeta.duration;
				}
				if (y.name === 'opacity') {
					y.value = component.animationmeta.opacity;
				}
			});

			this.intialiseTimeLine();

			// refresh HTML5 stage
			this.refreshStageSubject.next(true);
		}
	});

}

	public deleteAnimation(component: any) {
	//console.warn('Deleted Animation:', component, this.componentAnimations );

	this.componentAnimations = this.componentAnimations.filter((x) => x.id !== component.id);
	this.intialiseTimeLine();
}

	/**
	 * EVENTS FOR CANVAS CREATIVE
	 */
	public playAnimation() {

	this.animation_isPlaying = this.animation_isPlaying === true ? false : true;
	this.playStageAnimationSubject.next(this.animation_isPlaying);
	// close timeline if opened
	this.sidedrawer.close();
}

	public playGlobalAnimation() {

	this.animation_isPlaying = this.animation_isPlaying === true ? false : true;
	this.playGlobalAnimationSubject.next(this.animation_isPlaying);
	// close timeline if opened
	this.sidedrawer.close();
}

	public frameAnimationEnd($event: any) {
	this.animation_isPlaying = false;
	this.playStageAnimationSubject.next(null);

	//this.refreshBanner();
}

	public GlobalAnimationEnd($event: any) {
	this.animation_isPlaying = false;
	this.playGlobalAnimationSubject.next(null);
}

	public loopAnimation() {

	this.animation_isLooping = this.animation_isLooping === true ? false : true;

	this.loopStageAnimationSubject.next(this.animation_isLooping);
}

	public restartAnimation(db ?: any) {

	if (db !== undefined) {
		this.refreshStageSubject.next(db);
	} else {
		this.refreshStageSubject.next(true);
	}
}

	public refreshBanner(db ?: any) {

	if (db !== undefined) {
		this.refreshStageSubject.next(db);
	} else {
		this.refreshStageSubject.next(true);
	}
}

	public exportCreative(): void {

	//this.generateSubject.next(this.activeContainer);

	this.generateSubject.next(this.activeBannerSizes[0].containers);
}

	public previewCreative(): void {
	//this.alertService.info( 'WIP - Preview the current Creative.', { keepAfterRouteChange: false });
	this.previewActive = (this.previewActive === true) ? false : true;
	this.previewStageSubject.next(this.previewActive);
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

	/** GENERAL UI  **/

	public back(): void {
	this.location.back();
}

	private onboarding(): void {

	this.introJS.setOptions({
		showStepNumbers: true,
		showProgress: true,
		/** /
		steps: [
			{
				title: 'Template Banner Design',
				intro: "As an Admin user, you can design the layout of for the banner."
			}

			{
				element: '.walkthrough-adding-components',
				intro: "Click here to create a new account.",
				position: 'bottom-right-aligned'
			},
			/** /
		],
		/**/
		hints: [
			{
				element: '#mat-tab-label-0-0',
				hint: 'Click here to add new components.',
				hintPosition: 'top-middle',
			},
			{
				element: '#mat-tab-label-0-1',
				hint: 'Once a component is added. It will be listed in this tab for you to edit/save.',
				hintPosition: 'top-middle'
			}
		]
		/**/
	});
}

	public help(): void {

	this.introJS.refresh();

	this.introJS.addHints();

	this.introJS.showHints();

	//this.introJS.start();

	this.alertService.info('Help/Onboarding Feature still in WIP.', { keepAfterRouteChange: false });
}

	/** POSSIBLY DEPRECATED **/

	/**
	 * Receives drag and drop event results emitted from componentPositionUpdateEvent
	 * in banner.creator.directive.ts .
	 * add.edit component is subcribed to this emitted event
	 * through componentPositionUpdate (defined and initialised in add.edit.component.ts)
	 *
	 */
	public acceptComponentPositionUpdates(event: any) {
	console.log('acceptComponentPositionUpdates:', event);

	this.componentPositionUpdateEventfromPage.emit(event);
}

}
