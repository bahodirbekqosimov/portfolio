/**
 * TypeScript API interfaces generated directly from openapi.json
 */

export interface UserPublic {
  id: number;
  name: string;
  avatar: string | null;
}

export interface UserMe {
  id: number;
  name: string;
  avatar: string | null;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface UserAdminOut {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  created_at: string;
}

export interface UserUpdateIn {
  name: string;
}

export interface BanIn {
  reason: string;
  delete_comments: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginIn {
  email: string;
  password: string;
}

export interface RegisterIn {
  email: string;
  name: string;
  password: string;
}

export interface RegisterOut {
  message: string;
  email: string;
}

export interface VerifyEmailIn {
  email: string;
  password: string;
  code: string;
}

export interface ResendCodeIn {
  email: string;
}

export interface ForgotPasswordIn {
  email: string;
}

export interface ResetPasswordIn {
  email: string;
  code: string;
  new_password: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Portfolio & Home
export interface SkillOut {
  id: number;
  name: string;
}

export interface SkillAdminOut {
  id: number;
  name: string;
  show_home: boolean;
  sort_order: number;
}

export interface SkillCreate {
  name: string;
  show_home?: boolean;
  sort_order?: number;
}

export interface SkillUpdate {
  name?: string;
  show_home?: boolean;
  sort_order?: number;
}

export interface ProjectOut {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  link: string | null;
  skills: SkillOut[];
}

export interface ProjectAdminOut {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  link: string | null;
  skills: SkillOut[];
  is_active: boolean;
  show_home: boolean;
  sort_order: number;
}

export interface ProjectCreate {
  title: string;
  description?: string | null;
  image?: string | null;
  link?: string | null;
  is_active?: boolean;
  show_home?: boolean;
  sort_order?: number;
  skill_ids?: number[];
}

export interface ProjectUpdate {
  title?: string;
  description?: string | null;
  image?: string | null;
  link?: string | null;
  is_active?: boolean;
  show_home?: boolean;
  sort_order?: number;
  skill_ids?: number[];
}

export interface WorkExperienceOut {
  id: number;
  company: string;
  job_title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
}

export interface WorkExperienceAdminOut {
  id: number;
  company: string;
  job_title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  sort_order: number;
}

export interface WorkExperienceCreate {
  company: string;
  job_title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  sort_order?: number;
}

export interface WorkExperienceUpdate {
  company?: string;
  job_title?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string | null;
  sort_order?: number;
}

export interface EducationOut {
  id: number;
  institution: string;
  degree: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
}

export interface EducationAdminOut {
  id: number;
  institution: string;
  degree: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  sort_order: number;
}

export interface EducationCreate {
  institution: string;
  degree: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  sort_order?: number;
}

export interface EducationUpdate {
  institution?: string;
  degree?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string | null;
  sort_order?: number;
}

export interface ContactOut {
  id: number;
  name: string;
  data: string;
  image: string | null;
}

export interface ContactAdminOut {
  id: number;
  name: string;
  data: string;
  image: string | null;
  sort_order: number;
}

export interface ContactCreate {
  name: string;
  data: string;
  image?: string | null;
  sort_order?: number;
}

export interface ContactUpdate {
  name?: string;
  data?: string;
  image?: string | null;
  sort_order?: number;
}

export interface ProfileImageOut {
  url: string;
  updated_at: string;
}

export interface BioOut {
  content: string;
  headline: string | null;
  created_at: string;
  updated_at: string;
}

export interface BioIn {
  content: string;
  headline?: string | null;
}

export interface HomeOut {
  profile: UserPublic | null;
  profile_image: ProfileImageOut | null;
  bio: BioOut | null;
  work_experience: WorkExperienceOut[];
  projects: ProjectOut[];
  skills: SkillOut[];
  contacts: ContactOut[];
  education: EducationOut[];
}

// Blog
export interface TagOut {
  id: number;
  name: string;
}

export interface TagWithCount {
  id: number;
  name: string;
  posts_count: number;
}

export interface TagCreate {
  name: string;
}

export interface EmojiOut {
  id: number;
  name: string;
  image: string;
}

export interface EmojiAdminOut {
  id: number;
  name: string;
  image: string;
  is_active: boolean;
}

export interface EmojiCreate {
  name: string;
  image: string;
  is_active?: boolean;
}

export interface EmojiUpdate {
  name?: string;
  image?: string;
  is_active?: boolean;
}

export interface ReactionSummary {
  emoji_id: number;
  name: string;
  image: string;
  count: number;
  reacted_by_me: boolean;
}

export interface ReactionToggleIn {
  emoji_id: number;
}

export interface ReactionToggleOut {
  reacted: boolean;
  reactions: ReactionSummary[];
}

export interface BookmarkToggleOut {
  bookmarked: boolean;
}

export interface TextBlockIn {
  type: "text";
  text: string;
}

export interface TextBlockOut {
  type: "text";
  text: string;
}

export interface ImageBlockIn {
  type: "image";
  media_id: number;
}

export interface ImageBlockOut {
  type: "image";
  media_id: number;
  url: string;
  alt_text: string | null;
}

export type PostBlockIn = TextBlockIn | ImageBlockIn;
export type PostBlockOut = TextBlockOut | ImageBlockOut;

export interface PostListItem {
  title: string;
  slug: string;
  published_at: string;
}

export interface PostDetail {
  title: string;
  slug: string;
  image: string | null;
  content: PostBlockOut[];
  tags: TagOut[];
  views_count: number;
  published_at: string | null;
  updated_at: string;
  reactions: ReactionSummary[];
  comments_count: number;
  is_bookmarked: boolean;
}

export type PostStatus = "draft" | "published";

export interface MediaOut {
  id: number;
  url: string;
  alt_text: string | null;
}

export interface PostAdminListItem {
  id: number;
  title: string;
  slug: string;
  status: PostStatus;
  views_count: number;
  created_at: string;
  published_at: string | null;
}

export interface PostAdminOut {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  status: PostStatus;
  content: PostBlockOut[];
  tags: TagOut[];
  media: MediaOut[];
  views_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface PostCreate {
  title: string;
  slug?: string;
  image?: string | null;
  status?: PostStatus;
  tags?: string[];
  content?: PostBlockIn[];
}

export interface PostUpdate {
  title?: string;
  slug?: string;
  image?: string | null;
  status?: PostStatus;
  tags?: string[];
  content?: PostBlockIn[];
}

// Comments
export interface CommentReply {
  id: number;
  text: string | null;
  is_deleted: boolean;
  user: UserPublic | null;
  created_at: string;
  updated_at: string;
}

export interface CommentOut {
  id: number;
  text: string | null;
  is_deleted: boolean;
  user: UserPublic | null;
  created_at: string;
  updated_at: string;
  replies: CommentReply[];
}

export interface CommentCreateIn {
  text: string;
  parent_id?: number | null;
}

export interface CommentUpdateIn {
  text: string;
}

export interface ComplaintIn {
  reason: string;
}

export interface ComplaintOut {
  complaints_count: number;
  comment_deleted: boolean;
}

export interface CommentAdminOut {
  id: number;
  post_slug: string;
  text: string;
  user_id: number;
  user_name: string;
  is_deleted: boolean;
  deleted_reason: string | null;
  complaints_count: number;
  created_at: string;
}

export interface UploadOut {
  path: string;
  url: string;
}
