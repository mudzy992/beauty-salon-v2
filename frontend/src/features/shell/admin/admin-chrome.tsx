import { AppLogo } from '../../../components/brand/app-logo'
import { UploadedBrandLogo } from '../../../components/brand/uploaded-brand-logo'

type BrandProps = {
  hasLogo: boolean
  appLogo: string
  appTitle: string
  appLogoSvgColor: string
  appLogoTextColor: string
  appLogoAccent: string
  appLogoAnimated: boolean
}

/** Logo salona u admin omotaču:uploadovani brend ili ugrađeni naslov. */
export const AdminBrand = ({
  hasLogo,
  appLogo,
  appTitle,
  appLogoSvgColor,
  appLogoTextColor,
  appLogoAccent,
  appLogoAnimated,
}: BrandProps) =>
  hasLogo ? (
    <UploadedBrandLogo
      logoPath={appLogo}
      word={appTitle}
      svgColor={appLogoSvgColor}
      textColor={appLogoTextColor}
      className="app-logo--animated scale-[0.85] origin-left"
    />
  ) : (
    <AppLogo
      title={appTitle}
      accent={appLogoAccent}
      svgColor={appLogoSvgColor}
      textColor={appLogoTextColor}
      animated={appLogoAnimated}
      className="truncate"
    />
  )
