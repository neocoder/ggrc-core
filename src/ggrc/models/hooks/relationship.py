# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Relationship creation/modification hooks."""

from datetime import datetime

import sqlalchemy as sa

from ggrc.services import signals
from ggrc.models import all_models
from ggrc.models.comment import Commentable
from ggrc.models.mixins import ChangeTracked


def handle_comment_mapping(objects):
  """Update Commentable.updated_at when Comment mapped."""
  for obj in objects:
    if obj.source_type != u"Comment" and obj.destination_type != u"Comment":
      continue

    comment, other = obj.source, obj.destination
    if comment.type != u"Comment":
      comment, other = other, comment

    if isinstance(other, (Commentable, ChangeTracked)):
      other.updated_at = datetime.now()


def handle_asmnt_plan(objects):
  """Handle assessment test plan"""
  # pylint: disable=unused-argument
  for obj in objects:
    if (obj.source_type == "Assessment" and
        obj.destination_type == "Snapshot") or (
        obj.source_type == "Snapshot" and
        obj.destination_type == "Assessment"
    ):
      asmnt, snapshot = obj.source, obj.destination
      if asmnt.type != "Assessment":
        asmnt, snapshot = snapshot, asmnt

      # Test plan of snapshotted object should be copied to
      # Assessment test plan
      if asmnt.assessment_type == snapshot.child_type:
        snapshot_plan = snapshot.revision.content.get("test_plan")
        if asmnt.test_plan and snapshot_plan:
          asmnt.test_plan = asmnt.test_plan + "\n\n" + snapshot_plan
        elif snapshot_plan:
          asmnt.test_plan = snapshot_plan


def init_hook():
  """Initialize Relationship-related hooks."""
  sa.event.listen(all_models.Relationship, "before_insert",
                  all_models.Relationship.validate_attrs)
  sa.event.listen(all_models.Relationship, "before_update",
                  all_models.Relationship.validate_attrs)

  @signals.Restful.collection_posted.connect_via(all_models.Relationship)
  def relationship_post_listener(sender, objects=None, sources=None, **kwargs):
    # pylint: disable=unused-argument
    handle_comment_mapping(objects)
    handle_asmnt_plan(objects)
