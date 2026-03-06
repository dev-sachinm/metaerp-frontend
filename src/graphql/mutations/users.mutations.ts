/**
 * User Mutations - GraphQL mutations for user management.
 * createUser: dateOfBirth, mobileNumber, email are optional.
 */

import { UserFieldsFragment } from '../fragments/user.fragments';

/**
 * Create user mutation (createUser).
 * Required: firstName, lastName, username, password.
 * Optional: dateOfBirth, mobileNumber, email.
 * New users are created as active; duplicate username/email (when provided) returns GraphQL error.
 */
export const CREATE_USER_MUTATION = `
  ${UserFieldsFragment}
  mutation CreateUser(
    $firstName: String!
    $lastName: String!
    $username: String!
    $password: String!
    $dateOfBirth: Date
    $mobileNumber: String
    $email: String
  ) {
    createUser(
      firstName: $firstName
      lastName: $lastName
      username: $username
      password: $password
      dateOfBirth: $dateOfBirth
      mobileNumber: $mobileNumber
      email: $email
    ) {
      ...UserFields
    }
  }
`;

/**
 * Update user mutation (updateUser).
 * Requires update permission. All args except userId are optional. Username and password cannot be changed.
 */
export const UPDATE_USER_MUTATION = `
  ${UserFieldsFragment}
  mutation UpdateUser(
    $userId: String!
    $firstName: String
    $lastName: String
    $dateOfBirth: Date
    $mobileNumber: String
    $email: String
    $isActive: Boolean
  ) {
    updateUser(
      userId: $userId
      firstName: $firstName
      lastName: $lastName
      dateOfBirth: $dateOfBirth
      mobileNumber: $mobileNumber
      email: $email
      isActive: $isActive
    ) {
      ...UserFields
    }
  }
`;

/**
 * Delete user mutation (deleteUser).
 * Requires delete permission on user entity. Returns true if deleted, false if not found.
 */
export const DELETE_USER_MUTATION = `
  mutation DeleteUser($userId: String!) {
    deleteUser(userId: $userId)
  }
`;

/**
 * Add role to user. Per BACKEND_IMPLEMENTATION_STATE.md: addUserRole.
 * Requires update permission on user entity.
 */
export const ADD_USER_ROLE_MUTATION = `
  ${UserFieldsFragment}
  mutation AddUserRole($userId: String!, $roleId: String!) {
    addUserRole(userId: $userId, roleId: $roleId) {
      ...UserFields
    }
  }
`;

/**
 * Remove role from user. Per BACKEND_IMPLEMENTATION_STATE.md: removeUserRole.
 * Requires update permission on user entity.
 */
export const REMOVE_USER_ROLE_MUTATION = `
  ${UserFieldsFragment}
  mutation RemoveUserRole($userId: String!, $roleId: String!) {
    removeUserRole(userId: $userId, roleId: $roleId) {
      ...UserFields
    }
  }
`;

/** @deprecated Use ADD_USER_ROLE_MUTATION */
export const ASSIGN_ROLE_TO_USER_MUTATION = ADD_USER_ROLE_MUTATION;

/** @deprecated Use REMOVE_USER_ROLE_MUTATION */
export const REMOVE_ROLE_FROM_USER_MUTATION = REMOVE_USER_ROLE_MUTATION;

/**
 * Replace all roles for a user. Requires update permission on user entity.
 */
export const UPDATE_USER_ROLES_MUTATION = `
  ${UserFieldsFragment}
  mutation UpdateUserRoles($userId: String!, $roleIds: [String!]!) {
    updateUserRoles(userId: $userId, roleIds: $roleIds) {
      ...UserFields
    }
  }
`;

/**
 * Change the current user's password. Requires authentication.
 * Fails if current password is wrong. New password min 6 characters.
 */
export const CHANGE_PASSWORD_MUTATION = `
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

/**
 * Set another user's password (admin). Requires update permission on user entity.
 * New password min 6 characters.
 */
export const SET_USER_PASSWORD_MUTATION = `
  mutation SetUserPassword($userId: String!, $newPassword: String!) {
    setUserPassword(userId: $userId, newPassword: $newPassword)
  }
`;
