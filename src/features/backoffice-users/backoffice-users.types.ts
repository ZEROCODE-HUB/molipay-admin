export type BackofficeUserStatus = "invited" | "active" | "inactive";

export type BackofficeUser = {
  id: string;
  staffCode: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  roleIsSuperadmin: boolean;
  mustChangePassword: boolean;
  invitedAt: string | null;
  passwordSetAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  status: BackofficeUserStatus;
};

/** Para selectores (p. ej. ejecutivo de un comercio). */
export type BackofficeUserOption = Pick<BackofficeUser, "id" | "fullName" | "email">;

export type BackofficeUserFilters = {
  page: number;
  pageSize: number;
  search?: string;
  roleId?: string;
  status?: BackofficeUserStatus;
};

export type BackofficeUserPage = {
  rows: BackofficeUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type InviteBackofficeUserInput = {
  fullName: string;
  email: string;
  roleId: string;
  staffCode?: string;
};
