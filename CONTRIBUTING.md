# Contributing to Speed-Send

First off, thank you for considering contributing to Speed-Send! It's people like you that make Speed-Send such a great tool.

Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open-source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.

## Core Principles

The goal of this project is to provide a stable and reliable bulk email sending tool. To that end, we have a few core principles that we ask all contributors to adhere to:

*   **Preserve Core Functionality:** The core functionality of the project should remain the same. This includes the high-speed sending capabilities, Google Workspace integration, and campaign management features.
*   **Maintain Unique Page Content:** Each page in the application has a unique purpose and content. For example, the `campaigns/new` and `drafts/new` pages are distinct and should not be combined or have their functionality significantly altered.
*   **Stability Over Features:** While new features are welcome, they should not come at the expense of stability. All new features should be well-tested and not introduce breaking changes.

## Development Guidelines

### Frontend

*   **Component Structure:** New UI components should be placed in the `frontend/src/components/ui` directory.
*   **Page Content:** The unique content and layout of existing pages should be preserved. If you are proposing a significant change to the UI, please open an issue to discuss it first.
*   **Dependencies:** Please do not introduce new third-party libraries without opening an issue and getting approval from the project maintainers.

### Backend

*   **API Endpoints:** New API endpoints must be documented in the OpenAPI specification and include comprehensive tests.
*   **Database Schema:** Any changes to the database schema must be backward-compatible and include a migration plan.
*   **Security:** All code should be written with security in mind. Please be mindful of potential security vulnerabilities, such as SQL injection, cross-site scripting (XSS), and cross-site request forgery (CSRF).

## Code Style and Quality

*   **Consistency:** Please adhere to the existing code style.
*   **Documentation:** All new code should be well-documented with comments where necessary.
*   **Testing:** All new features should be accompanied by tests.

## Submitting Changes

1.  Fork the repository and create your branch from `main`.
2.  Make your changes, adhering to the guidelines above.
3.  Ensure that your code is well-tested.
4.  Create a pull request with a clear description of the changes you have made.
5.  The project maintainers will review your pull request and provide feedback.
