/* Optional group management helpers.
 * Keep page code independent from localStorage.
 * Later replace GroupRepository methods with API calls.
 */

function createGroup(name, description = "") {
  if (!name?.trim()) throw new Error("Group name is required");

  return GroupRepository.create({
    name: name.trim(),
    description: description.trim(),
  });
}

function updateGroup(groupId, data) {
  return GroupRepository.update(groupId, data);
}

function deleteGroup(groupId) {
  if (groupId === GROUP_ID) {
    throw new Error("Cannot delete the active group");
  }

  StateRepository.remove(groupId);
  GroupRepository.remove(groupId);
}

function switchGroup(groupId) {
  setActiveGroup(groupId);
}
