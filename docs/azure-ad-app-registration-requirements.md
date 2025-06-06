# Azure AD App Registration Requirements for Partner Portal v2.0

*This document should be updated as requirements evolve or further details are clarified.*

## 1. Overview

This document outlines the requirements for configuring the Microsoft Entra ID Application Registration for the Partner Portal v2.0. The App Registration is crucial for authenticating users and authorizing access to portal features and backend APIs, aligning with the security model defined in the project charter.

The primary goal is to leverage Entra ID's native security groups for initiative assignment and app roles for permission management, reducing dependency on Dynamics 365 for identity-related information.

## 2. Authentication Strategy

-   **Frontend (React SPA)**: Will use Microsoft Authentication Library for React (`@azure/msal-react`) to handle the OpenID Connect / OAuth 2.0 authorization code flow with PKCE. It will acquire ID tokens for user authentication and access tokens to call the backend API.
-   **Backend (Express API)**: Will use Microsoft Authentication Library for Node (`@azure/msal-node`) to validate access tokens received from the frontend and, if necessary, acquire tokens for downstream APIs (e.g., Microsoft Graph, Dynamics 365) using the on-behalf-of flow or client credentials flow.

## 3. Platform Configurations

The App Registration will require the following platform configurations:

-   **Single-page application (SPA)**:
    -   For the React frontend.
    -   **Redirect URIs**:
        -   `http://localhost:5173` (or other local development port)
        -   `http://localhost:5173/redirect` (or designated MSAL redirect page)
        -   Production/Staging frontend URLs (e.g., `https://partnerportal.example.com`)
    -   Enable **ID tokens** and **Access tokens** under implicit grant and hybrid flows (though authorization code flow is preferred for SPAs).

-   **Web**:
    -   For the Express backend API, if it needs to handle its own redirect for specific flows (e.g., admin consent for application permissions) or if it were to initiate auth directly (less common when SPA is primary).
    -   **Redirect URIs**:
        -   `http://localhost:3000/auth/microsoft/callback` (or designated backend callback path)
        -   Production/Staging backend API callback URLs (e.g., `https://api.partnerportal.example.com/auth/microsoft/callback`)

## 4. API Permissions

The application will require the following delegated permissions to Microsoft Graph:

-   **`openid`**: Implicitly requested for OpenID Connect.
-   **`profile`**: Implicitly requested for OpenID Connect.
-   **`email`**: To get the user's email address.
-   **`User.Read`**: To sign users in and read their basic profile information.
-   **`GroupMember.Read.All`**: To read the user's group memberships. This is essential for determining initiative access based on Entra ID security groups. *Admin consent required.*

If direct interaction with Dynamics 365 is still needed by the backend (for "organization/business data queries" as per the charter):
-   Appropriate **Dynamics CRM API permissions** (e.g., `user_impersonation` for delegated access or application permissions if using client credentials for specific D365 operations). This needs further clarification based on D365 integration specifics.

## 5. Token Configuration

The tokens issued by Entra ID should be configured to include specific claims:

-   **ID Tokens**: Issued to the frontend for user authentication.
    -   Ensure standard claims like `oid`, `tid`, `sub`, `name`, `preferred_username`, `email` are present.
    -   **`groups` claim**:
        -   Configure this in the "Token configuration" blade of the App Registration.
        -   Select "Security groups" or "All groups" (if Directory Roles or Distribution Lists are also needed, though Security Groups are primary for initiatives).
        -   Emit as "Group ID".
        -   This claim will be used to determine the user's initiative(s).
    -   **`roles` claim**:
        -   This claim will automatically be populated with the App Roles assigned to the user.
-   **Access Tokens**:
    -   Issued for the backend API (defined under "Expose an API").
    -   Should also contain `groups` and `roles` claims for the backend to perform authorization checks.
    -   The `aud` (audience) claim must match the backend API's Application ID URI or Client ID.
    -   The `scp` (scope) claim will reflect the scopes granted to the client (e.g., `access_as_user`).

## 6. App Roles Definition

The following application-specific roles need to be defined in the App Registration manifest (under "App roles"). These roles will be assigned to users or groups within Entra ID.

-   **Role: Admin**
    -   **Display Name**: `Admin`
    -   **Value**: `Admin`
    -   **Description**: Full administrative access to the portal.
    -   **Allowed Member Types**: `Users/Groups`

-   **Role: Foster Partner**
    -   **Display Name**: `Foster Partner`
    -   **Value**: `FosterPartner`
    -   **Description**: Access for foster partners within a specific initiative.
    -   **Allowed Member Types**: `Users/Groups`

-   **Role: Volunteer Partner**
    -   **Display Name**: `Volunteer Partner`
    -   **Value**: `VolunteerPartner`
    -   **Description**: Access for volunteer partners within a specific initiative.
    -   **Allowed Member Types**: `Users/Groups`

-   **Role: Foster Network-Wide Partner**
    -   **Display Name**: `Foster Network-Wide Partner`
    -   **Value**: `FosterNetworkWidePartner`
    -   **Description**: Access for foster partners with network-wide visibility.
    -   **Allowed Member Types**: `Users/Groups`

-   **Role: Volunteer Network-Wide Partner**
    -   **Display Name**: `Volunteer Network-Wide Partner`
    -   **Value**: `VolunteerNetworkWidePartner`
    -   **Description**: Access for volunteer partners with network-wide visibility.
    -   **Allowed Member Types**: `Users/Groups`

**Example Manifest Snippet for an App Role:**
```json
{
  "allowedMemberTypes": ["User", "Group"],
  "description": "Full administrative access to the portal.",
  "displayName": "Admin",
  "id": "<Generate a new GUID>",
  "isEnabled": true,
  "lang": null,
  "origin": "Application",
  "value": "Admin"
}
```

## 7. Security Groups for Initiatives

-   Entra ID Security Groups will be created to represent each initiative (e.g., "EC Arkansas", "EC Oklahoma").
-   Users will be added as members to these security groups based on their initiative affiliation.
-   The `groups` claim in the JWT (containing Group IDs) will be mapped to these initiative-specific security groups by the backend to determine user access.

## 8. Client Credentials

-   A **Client Secret** needs to be generated for the App Registration.
-   This secret will be used by the backend (Express API with MSAL Node) for confidential client flows, such as:
    -   Redeeming an authorization code (if the backend handles the final step of the auth code flow).
    -   Potentially for the on-behalf-of flow to call other APIs.
    -   Client credentials flow if the backend needs to access APIs like Microsoft Graph or D365 as itself (application permissions).
-   Store this secret securely (e.g., Azure Key Vault, environment variables). **Do not hardcode in the application.**

## 9. Exposing an API

To protect the backend Express API and allow the frontend to acquire access tokens for it:

-   In the App Registration, go to the **"Expose an API"** section.
-   Set an **Application ID URI**. A common format is `api://<client-id>` or a custom verifiable domain like `https://api.partnerportal.example.com`. This URI is the unique identifier for your API.
-   Define **Scopes**. At least one scope is needed for delegated permissions, for example:
    -   **Scope name**: `access_as_user`
    -   **Admin consent display name**: Access Partner Portal API as user
    -   **Admin consent description**: Allows the application to access the Partner Portal API on behalf of the signed-in user.
    -   **State**: Enabled
-   The frontend application will then request this scope (e.g., `api://<client-id>/access_as_user`) when acquiring an access token.
-   The backend API will validate that incoming access tokens have this scope and an audience claim (`aud`) matching its Application ID URI.

## 10. Summary of Key Identifiers

Upon successful registration and configuration, the following identifiers will be crucial for application configuration:

-   **Application (client) ID**: GUID identifying the App Registration.
-   **Directory (tenant) ID**: GUID identifying the Entra ID tenant.
-   **Client Secret**: (For backend) Secret string for confidential client flows.
-   **Application ID URI**: (For backend API) URI defined in "Expose an API".
-   **Well-known OpenID Configuration Endpoint**: `https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration`

This document should be updated as requirements evolve or further details are clarified.
