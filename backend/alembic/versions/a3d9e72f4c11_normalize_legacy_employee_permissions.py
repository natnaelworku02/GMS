"""normalize legacy employee permissions

Revision ID: a3d9e72f4c11
Revises: f1c6a83d9b20
"""

from typing import Sequence, Union

from alembic import op


revision: str = "a3d9e72f4c11"
down_revision: Union[str, Sequence[str], None] = "f1c6a83d9b20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Older installations stored employee access under the module name
    # ``employees``. The HR routes now consistently authorize against ``hr``.
    # Merge permissions first when a role already has both rows, then rename
    # any remaining legacy rows without violating uq_role_module.
    op.execute(
        """
        UPDATE role_permissions AS current_permission
        SET can_create = current_permission.can_create OR legacy_permission.can_create,
            can_read = current_permission.can_read OR legacy_permission.can_read,
            can_update = current_permission.can_update OR legacy_permission.can_update,
            can_delete = current_permission.can_delete OR legacy_permission.can_delete
        FROM role_permissions AS legacy_permission
        WHERE current_permission.role_id = legacy_permission.role_id
          AND current_permission.module = 'hr'
          AND legacy_permission.module = 'employees'
        """
    )
    op.execute(
        """
        DELETE FROM role_permissions AS legacy_permission
        WHERE legacy_permission.module = 'employees'
          AND EXISTS (
              SELECT 1
              FROM role_permissions AS current_permission
              WHERE current_permission.role_id = legacy_permission.role_id
                AND current_permission.module = 'hr'
          )
        """
    )
    op.execute(
        "UPDATE role_permissions SET module = 'hr' WHERE module = 'employees'"
    )


def downgrade() -> None:
    # This normalization is intentionally irreversible: after rows are merged,
    # their original module name cannot be recovered safely.
    pass
