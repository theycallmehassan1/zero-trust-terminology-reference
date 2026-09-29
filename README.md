# Zero Trust Terminology Reference

A short, practitioner-facing glossary of the terms used across the
[Transition-State Zero Trust Adoption Toolkit](https://github.com/theycallmehassan1/transition-state-zero-trust-toolkit)
and the related zero-trust modernization write-ups. Definitions follow
NIST SP 800-207 (Zero Trust Architecture) and NIST SP 1800-35
(Implementing a Zero Trust Architecture) where a term originates there.

## Core concepts

**Zero trust (ZT).** A security model built on the principle that no
user, device, or network location is trusted by default. Every access
request is evaluated on its own merits, regardless of whether it
originates inside or outside a traditional network perimeter.

**Zero trust architecture (ZTA).** The set of components, workflows,
and policies that implement zero trust principles for an
organization's systems and data.

**Policy decision point (PDP).** The logical component that evaluates
an access request against policy and returns a decision to grant, deny,
or limit access. NIST SP 800-207 splits the PDP conceptually into a
policy engine (makes the decision) and a policy administrator
(executes it).

**Policy enforcement point (PEP).** The component that enables,
monitors, and terminates connections between a subject and a resource,
acting on the decision the PDP returns. A PEP typically sits directly
in front of the resource it protects.

**Subject.** The user, service account, or system requesting access to
a resource.

**Resource.** Anything zero trust is protecting access to: an
application, a data set, an API, a device, or a service.

## Access and identity

**Least privilege.** Granting a subject only the access required to
complete a specific task, for only as long as it is needed, rather than
standing access to a broader set of resources.

**Multi-factor authentication (MFA).** Authentication requiring two or
more independent evidence factors (something you know, have, or are)
before granting access.

**Continuous authentication / continuous evaluation.** Re-checking a
session's trust level throughout its lifetime, rather than only at
initial login, so that a session can be limited or terminated if
context changes (new location, new device posture, anomalous
behavior).

**Just-in-time (JIT) access.** Access granted for a bounded window,
tied to a specific task, and revoked automatically when the window
closes, rather than left standing.

## Network and segmentation

**Microsegmentation.** Dividing a network into small, isolated zones so
that a compromise in one zone does not grant lateral access to others.
Enforced at the workload or identity level rather than only at the
network perimeter.

**East-west traffic.** Traffic moving between systems inside an
environment (server to server, service to service), as distinct from
north-south traffic entering or leaving the environment. Zero trust
places particular emphasis on monitoring and controlling east-west
traffic, since perimeter-only models leave it largely unmonitored.

**Software-defined perimeter (SDP).** An approach that makes resources
invisible to unauthorized users by default, only exposing a connection
path after the requesting subject and device have been authenticated
and authorized.

## Transition state

**Transition state.** The operating period between a legacy
architecture and a target zero trust architecture, during which legacy
and modern controls coexist. NIST SP 1800-35 establishes that this
period exists but does not govern it in detail, this toolkit's own
focus.

**Compensating control.** A control put in place to manage risk from a
gap or exception that cannot be closed immediately, until the
underlying gap is resolved.

**Temporary exception.** An access path, rule, or configuration granted
outside normal policy for a defined reason and period. Requires an
owner, a compensating control, a monitoring method, and an expiry or
retirement condition to avoid becoming a permanent, unmanaged risk.

## Sources

- NIST SP 800-207, *Zero Trust Architecture*
- NIST SP 1800-35, *Implementing a Zero Trust Architecture*
- NIST CSF 2.0

---

Part of the same practitioner work as the
[Transition-State Zero Trust Adoption Toolkit](https://github.com/theycallmehassan1/transition-state-zero-trust-toolkit).
