/**
 * Role Fragments - Reusable field selections for roles
 */

export const RoleFieldsFragment = `
  fragment RoleFields on RoleType {
    id
    name
    description
  }
`;

export const RolePaginationInfoFragment = `
  fragment RolePaginationInfo on PaginatedRolesType {
    total
    skip
    limit
    page
    totalPages
    hasMore
  }
`;
