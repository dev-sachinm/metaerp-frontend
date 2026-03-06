/**
 * Permission Fragments - Reusable field selections for permissions
 */

export const EntityPermissionFieldsFragment = `
  fragment EntityPermissionFields on EntityPermissionType {
    id
    entityName
    canCreate
    canRead
    canUpdate
    canDelete
  }
`;

export const FieldPermissionFieldsFragment = `
  fragment FieldPermissionFields on FieldPermissionType {
    id
    entityName
    fieldName
    canRead
    canWrite
  }
`;
