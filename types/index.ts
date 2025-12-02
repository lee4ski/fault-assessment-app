// Assessment Criteria Types
export interface AssessmentCriteria {
  id: string;
  chapter: number;
  chapterTitle: string;
  title: string;
  description: string;
  summary?: string; // 要約（100-200字）
  baseFaultPercentage: number;
  modificationFactors: ModificationFactor[];
  pageNumber?: number;
  sourceBook?: string; // 書籍名（例: "別冊判例タイムズ"）
  sourceEdition?: string; // 版（例: "第38号"）
}

export interface ModificationFactor {
  id: string;
  description: string;
  adjustment: number; // Percentage adjustment (e.g., -5, +10)
  category: string; // e.g., "pedestrian", "vehicle", "road"
}

export interface AccidentReport {
  id?: string;
  accidentType: string;
  description: string;
  selectedCriteria?: AssessmentCriteria;
  baseFaultPercentage?: number;
  appliedModifications: AppliedModification[];
  finalFaultPercentage?: number;
  createdAt?: Date;
  overrideReason?: string; // AI推奨を上書きした理由 (Story C-2)
}

export interface AppliedModification {
  factorId: string;
  factorDescription: string;
  adjustment: number;
}

// Search Types
export interface SearchResult {
  criteria: AssessmentCriteria;
  relevanceScore: number;
  matchType: "prefix" | "partial" | "suffix";
  matchField: "title" | "description" | "chapterTitle";
}

// Hit count per chapter/section
export interface ChapterHitCount {
  chapter: number;
  chapterTitle: string;
  count: number;
}

// Accident Attributes for structured input
export interface AccidentAttributes {
  accidentType?: string; // 事故類型（例: "歩行者×四輪", "車両×車両"）
  location?: string; // 場所（例: "交差点", "駐車場", "高速道路"）
  partyTypes?: string[]; // 当事者種別（例: ["歩行者", "四輪車"]）
  hasSignal?: boolean; // 信号有無 (Legacy support)
  signalAttribute?: string; // 信号の状況（例: "赤信号", "青信号"）- Legacy
  signalA?: string; // 当事者Aの信号
  signalB?: string; // 当事者Bの信号
  actionA?: string; // 当事者Aの行動（例: "直進", "右折", "横断"）
  actionB?: string; // 当事者Bの行動
  otherAttributes?: Record<string, string>; // その他の属性
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId?: string;
  timestamp: Date;
  action: "search" | "select" | "calculate" | "ai_feedback";
  inputConditions?: AccidentAttributes | string; // 入力条件（構造化またはテキスト）
  searchResults?: SearchResult[];
  selectedCriteria?: AssessmentCriteria;
  aiRecommendations?: { criteriaId: string; score: number }[]; // AI推奨内容
  overrideReason?: string; // AI推奨を上書きした理由
  hash: string; // 改ざん防止のためのハッシュ
}

// Vehicle Types (User Story 3)
export interface Vehicle {
  id: string;
  modelCode: string; // 型式コード
  make: string; // メーカー
  model: string; // 車名
  year: string; // 年式
  releaseDate?: string; // 発売日 (YYYY/M format)
  newCost?: number; // 新車価格
  priceRangeMax?: number; // 最高車両価格
  priceRangeMin?: number; // 最低車両価格
  bodilyInjuryClass?: number; // 対人賠償クラス
  propertyDamageClass?: number; // 対物賠償クラス
  passengerInjuryClass?: number; // 搭乗者傷害クラス
  vehicleDamageClass?: number; // 車両損害クラス
  useType?: string; // 用途車種
  isCustom?: boolean; // ユーザーが作成したカスタム車両
}

export interface VehicleSearchParams {
  modelCode?: string;
  make?: string;
  model?: string;
  registrationDate?: Date; // 初度登録年月
}

// Attachment Types (User Story 4)
export interface Attachment {
  id: string;
  filename: string;
  type: 'image' | 'video' | 'document';
  url: string;
  size: number;
  uploadedAt: Date;
  aiCaption?: string; // AI生成のキャプション
  thumbnail?: string;
}

// Approval Workflow Types (User Story 4)
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface ApprovalAction {
  id: string;
  userId: string;
  userName: string;
  action: 'submit' | 'approve' | 'reject' | 'comment';
  timestamp: Date;
  comment?: string;
}

// Complete Accident Report (User Story 4)
export interface AccidentReportFull extends AccidentReport {
  vehicles: Vehicle[]; // 事故関係車両
  attachments: Attachment[]; // 添付ファイル
  reportText: string; // 報告書本文（リッチテキスト）
  status: ApprovalStatus; // 承認ステータス
  approvalHistory: ApprovalAction[]; // 承認履歴
  version: number; // バージョン番号
  updatedAt?: Date;
  sections?: ReportSection[]; // 報告書セクション
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  isAIGenerated?: boolean;
}

// AI Recommendation Types (User Story 2)
export interface AIRecommendation {
  criteriaId: string;
  criteria: AssessmentCriteria;
  score: number; // 0-100
  reason: string; // 推論根拠
  extractedFeatures?: string[]; // 抽出された特徴
}

// Wizard State
export interface WizardState {
  currentStep: number;
  completedSteps: number[];
  report: AccidentReportFull | null;
  canProceed: boolean;
}
