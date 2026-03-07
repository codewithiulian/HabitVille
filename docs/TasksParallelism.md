Add the following parallel group labels to each issue on the GitHub project board. Issues within the same group can be executed simultaneously once their dependencies are complete.

Phase 0 (start immediately):
#60

Phase 1 (after Phase 0):
#48

Phase 2 (after Phase 1 — run in parallel):
#49, #50

Phase 3 (after Phase 2 — run in parallel):
#51, #53, #54, #55, #56

Phase 4 (after #51 completes):
#52

Phase 5 (after all Phase 3 + Phase 4 — run in parallel):
#57, #58, #59

Note: #51 depends on #50 only, so it can start as soon as #50 is done even if #49 is still running. #52 needs both #49 and #51 done. All Phase 5 items need everything before them complete.
