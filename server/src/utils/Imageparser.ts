/**
 * Parsed container image components
 */
export interface ParsedImage {
  hasDigest: boolean;
  digest?: string; // sha256:...
  repoPart: string; // without tag/digest, e.g. quay.io/org/app
  tag?: string; // e.g. 1.0.0
  hasTag: boolean;
}

/**
 * Utility class for parsing and manipulating container image references
 */
export class ImageParser {
  /**
   * Parse a container image reference into its components
   * 
   * Examples:
   * - "quay.io/myorg/app:1.0.0" -> { repoPart: "quay.io/myorg/app", tag: "1.0.0", hasTag: true, hasDigest: false }
   * - "quay.io/myorg/app@sha256:abc..." -> { repoPart: "quay.io/myorg/app", digest: "sha256:abc...", hasDigest: true, hasTag: false }
   * - "quay.io/myorg/app" -> { repoPart: "quay.io/myorg/app", hasTag: false, hasDigest: false }
   */
  static parse(image: string): ParsedImage {
    const [withoutDigest, digest] = image.split("@");
    const hasDigest = image.includes("@") && !!digest;

    const lastSlash = withoutDigest.lastIndexOf("/");
    const lastColon = withoutDigest.lastIndexOf(":");

    // If last ":" is after last "/", it's a tag separator (not a registry port)
    const hasTag = lastColon > lastSlash;

    const repoPart = hasTag ? withoutDigest.slice(0, lastColon) : withoutDigest;
    const tag = hasTag ? withoutDigest.slice(lastColon + 1) : undefined;

    return { hasDigest, digest, repoPart, tag, hasTag };
  }

  /**
   * Extract just the tag from an image reference
   * Returns "latest" if no tag is present
   */
  static extractTag(image: string): string {
    const withoutDigest = image.split("@")[0];
    const lastSlash = withoutDigest.lastIndexOf("/");
    const lastColon = withoutDigest.lastIndexOf(":");

    const hasTag = lastColon > lastSlash;
    if (!hasTag) return "latest";

    return withoutDigest.slice(lastColon + 1);
  }

  /**
   * Replace the tag in an image reference
   * If the image has a digest, it will be dropped in favor of the new tag
   * 
   * Examples:
   * - replaceTag("quay.io/org/app:1.0.0", "2.0.0") -> "quay.io/org/app:2.0.0"
   * - replaceTag("quay.io/org/app@sha256:abc", "2.0.0") -> "quay.io/org/app:2.0.0"
   */
  static replaceTag(currentImage: string, newTag: string): string {
    const parsed = this.parse(currentImage);
    return `${parsed.repoPart}:${newTag}`;
  }
}